'use client';

import { useState, useEffect } from 'react';
import { getImageUrl } from '@/utils/media';
import { toggleLikeAction, addCommentAction, getLikersAction } from '@/app/actions/interactionActions';

// A simple timeAgo helper for comments
const timeAgo = (date) => {
  if (!date) return "now";
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "m";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "min";
  return Math.floor(seconds) + "s";
};

export default function CommentItem({ comment, postId, activeUser, onReplyAdded }) {
  const [mounted, setMounted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(comment?.likesCount || 0);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine initial like state by fetching likers
  useEffect(() => {
    setMounted(true);
    let isMounted = true;

    async function checkLikers() {
      if (!comment?._id || !activeUser?._id) return;
      
      const res = await getLikersAction(comment._id);
      if (res.success && isMounted) {
        // Find if active user is in likers array
        const userLiked = res.likers.some(liker => 
            liker.user?._id === activeUser._id || liker.user === activeUser._id
        );
        setIsLiked(userLiked);
      }
    }
    
    checkLikers();
    
    return () => { isMounted = false; };
  }, [comment?._id, activeUser?._id]);

  const handleLikeToggle = async () => {
    if (!activeUser) return;
    
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    const res = await toggleLikeAction(comment._id, 'Comment');
    
    if (!res.success) {
      // Revert on failure
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
    }
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    
    const res = await addCommentAction(postId, replyContent, comment._id);
    
    if (res.success) {
      setReplyContent('');
      setIsReplying(false);
      if (onReplyAdded) {
        onReplyAdded(res.comment); // Trigger refetch in parent
      }
    }
    
    setIsSubmitting(false);
  };

  if (!comment) return null;

  const author = comment.user?.username || 'Unknown User';
  const authorImg = getImageUrl(comment.user?.profilePic) || '/images/user_avatar.svg';
  const time = mounted && comment.createdAt ? timeAgo(comment.createdAt) : 'now';

  return (
    <div className="_comment_main" style={{ marginBottom: '15px' }}>
      <div className="_comment_image">
        <a href="#0" className="_comment_image_link">
          <img src={authorImg} alt={author} className="_comment_img1" />
        </a>
      </div>
      <div className="_comment_area" style={{ flex: 1 }}>
        <div className="_comment_details">
          <div className="_comment_details_top">
            <div className="_comment_name">
               <h4 className="_comment_name_title">{author}</h4>
            </div>
          </div>
          <div className="_comment_status">
            <p className="_comment_status_text" style={{ wordBreak: 'break-word' }}>
              <span>{comment.content}</span>
            </p>
          </div>
          
          {likesCount > 0 && (
            <div className="_total_reactions">
              <div className="_total_react">
                <span className="_reaction_like">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                  </svg>
                </span>
              </div>
              <span className="_total">{likesCount}</span>
            </div>
          )}
          
          <div className="_comment_reply">
            <div className="_comment_reply_num">
              <ul className="_comment_reply_list" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <li style={{ cursor: 'pointer', fontWeight: isLiked ? '600' : '400', color: isLiked ? '#1890FF' : 'inherit' }} onClick={handleLikeToggle}>
                  <span>Like</span>
                </li>
                <li style={{ cursor: 'pointer' }} onClick={() => setIsReplying(!isReplying)}>
                  <span>Reply</span>
                </li>
                <li><span className="_time_link">{time}</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Nested Reply Input */}
        {isReplying && (
          <div className="_feed_inner_comment_box" style={{ marginTop: '10px' }}>
            <form className="_feed_inner_comment_box_form" onSubmit={submitReply} style={{ alignItems: 'center' }}>
              <div className="_feed_inner_comment_box_content" style={{ flex: 1, border: '1px solid #E4E6EB', borderRadius: '20px', padding: '2px 10px', display: 'flex', alignItems: 'center' }}>
                <input 
                  type="text" 
                  className="form-control _comment_textarea" 
                  placeholder="Write a reply..." 
                  style={{ minHeight: 'auto', padding: '8px 5px', border: 'none', boxShadow: 'none' }}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
              <button type="submit" disabled={isSubmitting || !replyContent.trim()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1890FF', fontWeight: 'bold', marginLeft: '10px' }}>
                {isSubmitting ? '...' : 'Post'}
              </button>
            </form>
          </div>
        )}

        {/* Recursive rendering of replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="_nested_replies" style={{ marginTop: '12px', position: 'relative' }}>
             {/* Small visual line to denote grouping */}
             <div style={{ position: 'absolute', left: '-25px', top: '0', bottom: '20px', width: '2px', backgroundColor: '#F0F2F5' }}></div>
             
            {comment.replies.map(reply => (
              <CommentItem 
                key={reply._id} 
                comment={reply} 
                postId={postId}
                activeUser={activeUser}
                onReplyAdded={onReplyAdded}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
