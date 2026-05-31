"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { UserProfile } from "@/types";

interface AvatarUploadProps {
  profilePictureUrl: string | null;
  username: string;
  editable?: boolean;
}

export default function AvatarUpload({ profilePictureUrl, username, editable = false }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { updateProfile } = useAuthStore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post<UserProfile>("/api/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((r) => r.data);
    },
    onSuccess: (data) => {
      updateProfile({ profilePictureUrl: data.profilePictureUrl });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setPreviewUrl(null);
    },
    onError: () => {
      setPreviewUrl(null);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      alert("Only JPEG, PNG and WebP images are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be 2 MB or smaller");
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    mutation.mutate(file);
  };

  const initials = username
    .split(/[_\s]/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const displayUrl = previewUrl || profilePictureUrl;

  return (
    <div className="relative group">
      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-green-500/40 flex items-center justify-center bg-green-500/10 shrink-0">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt={username}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-display text-xl font-bold text-green-400">{initials}</span>
        )}

        {/* Upload overlay */}
        {editable && !mutation.isPending && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
          >
            <Camera size={20} className="text-green-400" />
          </button>
        )}

        {/* Loading spinner */}
        {mutation.isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
            <Loader2 size={20} className="text-green-400 animate-spin" />
          </div>
        )}
      </div>

      {/* Glow ring */}
      <div className="absolute -inset-1 rounded-full border border-green-500/20 pointer-events-none" />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
