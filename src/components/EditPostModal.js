'use client';

import { useState, useRef, useEffect } from 'react';
import { getImageUrl } from '@/utils/media';
import { updatePostAction } from '@/app/actions/postActions';
import { useToast } from './ToastProvider';

export default function EditPostModal({ isOpen, onClose, post }) {
  const [content, setContent] = useState(post?.content || '');
  const [imagePreview, setImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();

  // Sync state when post prop changes or modal opens
  useEffect(() => {
    if (isOpen && post) {
      setContent(post.content || '');
      setImagePreview(null);
      setRemoveImage(false);
    }
  }, [isOpen, post]);

  if (!isOpen) return null;

  const currentImage = post?.mediaUrl ? getImageUrl(post.mediaUrl) : null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
      setRemoveImage(false);
    }
  };

  const handleRemoveImage = () => {
    setRemoveImage(true);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!content.trim() && !currentImage && !imagePreview) {
      toast.error('Post must have content or an image.');
      return;
    }

    setIsSaving(true);

    // Always use FormData so the image file can be included
    const formData = new FormData(e.target);
    formData.set('content', content);
    if (removeImage) formData.set('removeImage', 'true');
    // If a new file was selected it is already in formData via the file input named 'image'

    const res = await updatePostAction(post._id, formData);
    setIsSaving(false);

    if (res.success) {
      toast.success('Post updated!');
      // Pass updated content and new mediaUrl back to parent for optimistic update
      onClose(true, content, res.mediaUrl);
    } else {
      toast.error(res.error || 'Failed to update post.');
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose(false);
  };

  const displayImage = imagePreview || (!removeImage && currentImage);

  return (
    <div className="_edit_post_overlay" onClick={handleOverlayClick}>
      <div className="_edit_post_modal">
        {/* Header */}
        <div className="_edit_post_header">
          <h4 className="_edit_post_title">Edit Post</h4>
          <button className="_edit_post_close" onClick={() => onClose(false)} aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave}>
          <div className="_edit_post_body">
            {/* Author info */}
            <div className="_edit_post_author">
              <img
                src={getImageUrl(post?.user?.profilePic) || '/images/user_avatar.svg'}
                alt="author"
                className="_edit_post_author_img"
              />
              <div>
                <span className="_edit_post_author_name">
                  {post?.user?.firstName && post?.user?.lastName
                    ? `${post.user.firstName} ${post.user.lastName}`
                    : post?.user?.username || 'User'}
                </span>
              </div>
            </div>

            {/* Content Editor */}
            <textarea
              className="_edit_post_textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
            />

            {/* Image Preview */}
            {displayImage && (
              <div className="_edit_post_image_wrap">
                <img src={displayImage} alt="Post media" className="_edit_post_image_preview" />
                <button
                  type="button"
                  className="_edit_post_image_remove"
                  onClick={handleRemoveImage}
                  title="Remove image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            )}

            {/* Add/Change Image */}
            <div className="_edit_post_toolbar">
              <input
                type="file"
                ref={fileInputRef}
                name="image"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="_edit_post_toolbar_btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                {displayImage ? 'Change Photo' : 'Add Photo'}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="_edit_post_footer">
            <button
              type="button"
              className="_edit_post_btn _edit_post_btn_cancel"
              onClick={() => onClose(false)}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="_edit_post_btn _edit_post_btn_save"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="_btn_spinner"></span>
                  Saving...
                </>
              ) : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
