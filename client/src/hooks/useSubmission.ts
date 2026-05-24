import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useRoomStore } from "@/store/roomStore";
import { SubmissionResponse, Language } from "@/types";

export function useSubmit() {
  const { setSubmitting } = useRoomStore();

  return useMutation({
    mutationFn: (data: {
      roomId: string;
      problemId: string;
      code: string;
      language: Language;
    }) =>
      api.post<SubmissionResponse>("/api/submissions", data).then((r) => r.data),
    onMutate: () => setSubmitting(true),
    onSettled: () => setSubmitting(false),
    onSuccess: () => toast.loading("Running test cases...", { id: "submit" }),
    onError: () => toast.error("Submission failed"),
  });
}

export function useRoomSubmissions(roomId: string) {
  return useQuery({
    queryKey: ["submissions", "room", roomId],
    queryFn: () =>
      api
        .get<SubmissionResponse[]>(`/api/submissions/room/${roomId}`)
        .then((r) => r.data),
    enabled: !!roomId,
  });
}
