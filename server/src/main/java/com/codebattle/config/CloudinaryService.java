package com.codebattle.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp"
    );
    private static final long MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

    /**
     * Upload a profile avatar image to Cloudinary.
     * Auto-crops to 256x256, stores in "codebattle/avatars" folder.
     *
     * @return secure HTTPS URL of the uploaded image
     */
    @SuppressWarnings("unchecked")
    public String uploadAvatar(MultipartFile file, String userId) {
        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only JPEG, PNG and WebP images are allowed");
        }

        // Validate file size
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Image must be 2 MB or smaller");
        }

        try {
            Map<String, Object> result = cloudinary.uploader().upload(file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "codebattle/avatars",
                            "public_id", userId,
                            "overwrite", true,
                            "resource_type", "image",
                            "transformation", "c_fill,w_256,h_256,q_auto,f_auto"
                    ));

            String secureUrl = (String) result.get("secure_url");
            log.info("Avatar uploaded for user {}: {}", userId, secureUrl);
            return secureUrl;
        } catch (IOException e) {
            log.error("Cloudinary upload failed for user {}", userId, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Image upload failed. Please try again.");
        }
    }
}
