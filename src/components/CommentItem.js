'use client';

import { useState, useEffect } from 'react';
import { getImageUrl } from '@/utils/media';
import { toggleLikeAction, addCommentAction, getLikersAction, deleteCommentAction, updateCommentAction } from '@/app/actions/interactionActions';
import LikersModal from './LikersModal';

const REACTIONS = [
  { type: 'Like', icon: '👍', color: '#1890FF' },
  { type: 'Love', icon: '❤️', color: '#f9197f' },
  { type: 'Haha', icon: '😆', color: '#ffb900' },
  { type: 'Wow', icon: '😮', color: '#ffb900' },
  { type: 'Sad', icon: '😢', color: '#ffb900' },
  { type: 'Angry', icon: '😡', color: '#f05d51' },
];

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

export default function CommentItem({ comment, postId, activeUser, onCommentModified }) {
  const [mounted, setMounted] = useState(false);
  const [userReaction, setUserReaction] = useState(null);
  const [likesCount, setLikesCount] = useState(comment?.likesCount || 0);
  const [reactionCounts, setReactionCounts] = useState({});
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [hoveringLike, setHoveringLike] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState(null);

  // Pagination for replies
  const [visibleReplies, setVisibleReplies] = useState(2);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment?.content || '');
  const [isSaving, setIsSaving] = useState(false);

  // Determine initial like state by fetching likers
  useEffect(() => {
    setMounted(true);
    let isMounted = true;

    async function checkLikers() {
      if (!comment?._id) return;
      
      const res = await getLikersAction(comment._id, 'Comment');
      if (res.success && isMounted) {
        console.log('REACTION_COUNTS_DEBUG', res.countsByReaction);
        // Find if active user is in likers array
        if (activeUser?._id) {
          const currentUserLiker = res.likers.find(liker => 
              liker.user?._id === activeUser._id || liker.user === activeUser._id
          );
          setUserReaction(currentUserLiker ? currentUserLiker.reactionType : null);
        }
        setReactionCounts(res.countsByReaction || {});
        // Debugging reaction icons
        if (Object.keys(res.countsByReaction || {}).length > 1) {
            console.log('REACTION_COUNTS_MULTIPLE', comment._id, res.countsByReaction);
        }
      }
    }
    
    checkLikers();
    
    return () => { isMounted = false; };
  }, [comment?._id, activeUser?._id]);

  const handleLikeToggle = async (reactionType = 'Like') => {
    if (!activeUser) return;
    
    const previousReaction = userReaction;
    const previousLikesCount = likesCount;
    const previousReactionCounts = { ...reactionCounts };

    let nextReaction = reactionType;
    let nextCount = likesCount;

    if (userReaction === reactionType) {
        nextReaction = null;
        nextCount -= 1;
    } else if (userReaction === null) {
        nextCount += 1;
    }

    setUserReaction(nextReaction);
    setLikesCount(nextCount);
    setHoveringLike(false);

    const res = await toggleLikeAction(comment._id, 'Comment', reactionType);
    
    if (res.success) {
        // Refetch likers to get accurate counts
        const likersRes = await getLikersAction(comment._id, 'Comment');
        if (likersRes.success) {
            setReactionCounts(likersRes.countsByReaction || {});
        }
    } else {
      setUserReaction(previousReaction);
      setLikesCount(previousLikesCount);
      setReactionCounts(previousReactionCounts);
    }
  };

  const handleMainButtonClick = () => {
     handleLikeToggle(userReaction || 'Like');
  };

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
        setHoveringLike(true);
    }, 500);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setHoveringLike(false);
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    
    const res = await addCommentAction(postId, replyContent, comment._id);
    
    if (res.success) {
      setReplyContent('');
      setIsReplying(false);
      if (onCommentModified) {
        onCommentModified(); // Trigger refetch in parent
      }
    }
    
    setIsSubmitting(false);
  };

  const handleDeleteClick = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    setIsDeleting(true);
    const res = await deleteCommentAction(comment._id);
    if (res.success) {
      if (onCommentModified) onCommentModified();
    } else {
      alert(res.error || 'Failed to delete comment');
    }
    setIsDeleting(false);
  };

  const handleEditSave = async () => {
    if (!editContent.trim()) return;
    setIsSaving(true);
    const res = await updateCommentAction(comment._id, editContent);
    if (res.success) {
        setIsEditing(false);
        if (onCommentModified) onCommentModified();
    } else {
        alert(res.error || 'Failed to update comment');
    }
    setIsSaving(false);
  };

  if (!comment) return null;

  const author = (comment.user?.firstName && comment.user?.lastName) 
    ? `${comment.user.firstName} ${comment.user.lastName}` 
    : (comment.user?.username || 'Unknown User');
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
            {isEditing ? (
                <div style={{ padding: '8px 0' }}>
                    <textarea 
                        className="form-control form-control-sm"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        style={{ borderRadius: '10px', marginBottom: '8px', minHeight: '60px', width: '100%', fontSize: '14px' }}
                    />
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', fontSize: '13px' }}>
                        <span 
                            style={{ cursor: 'pointer', color: '#666' }} 
                            onClick={() => { setIsEditing(false); setEditContent(comment.content); }}
                        >
                            Cancel
                        </span>
                        <span 
                            style={{ cursor: 'pointer', color: '#1890FF', fontWeight: '600' }} 
                            onClick={handleEditSave}
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </span>
                    </div>
                </div>
            ) : (
                <p className="_comment_status_text" style={{ wordBreak: 'break-word' }}>
                  <span>{comment.content}</span>
                </p>
            )}
          </div>
          
          {likesCount > 0 && (
            <div 
                className="_total_reactions" 
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                onClick={() => setShowLikersModal(true)}
                title="View likers"
            >
              <div className="_reaction_summary_icons" style={{ marginRight: '8px', display: 'flex', alignItems: 'center', height: '24px' }}>
                  {REACTIONS.filter(reac => (reactionCounts[reac.type] || 0) > 0).slice(0, 3).map((reac, idx) => (
                      <span key={reac.type} className="_reaction_icon_stacked" style={{ 
                        width: '20px', 
                        height: '20px', 
                        fontSize: '12px', 
                        marginLeft: idx > 0 ? '-8px' : '0', 
                        zIndex: 10 + idx, // Changed to 10 + idx so latest types are on TOP
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#fff',
                        borderRadius: '50%',
                        border: '2px solid #fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        flexShrink: 0
                      }}>
                        {reac.icon}
                      </span>
                  ))}
              </div>
              <span className="_total">{likesCount}</span>
            </div>
          )}
          
          <LikersModal 
            isOpen={showLikersModal}
            onClose={() => setShowLikersModal(false)}
            targetId={comment._id}
            targetType="Comment"
          />
          
          <div className="_comment_reply">
            <div className="_comment_reply_num">
              <ul className="_comment_reply_list" style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }}>
                <li 
                    style={{ cursor: 'pointer', position: 'relative' }} 
                    onMouseEnter={handleMouseEnter} 
                    onMouseLeave={handleMouseLeave}
                    onClick={handleMainButtonClick}
                >
                  {hoveringLike && (
                        <div className="_reaction_picker_wrap" style={{ bottom: '25px', left: '-10px' }} onMouseEnter={() => setHoveringLike(true)}>
                            {REACTIONS.map(reac => (
                                <span 
                                    key={reac.type} 
                                    className="_reaction_item" 
                                    onClick={(e) => { e.stopPropagation(); handleLikeToggle(reac.type); }}
                                    title={reac.type}
                                >
                                    {reac.icon}
                                    <span className="_reaction_name_tooltip">{reac.type}</span>
                                </span>
                            ))}
                        </div>
                    )}
                  <span style={{ 
                      color: userReaction ? (REACTIONS.find(r => r.type === userReaction)?.color || '#1890FF') : 'inherit',
                      fontWeight: userReaction ? 'bold' : '400'
                  }}>
                    {userReaction ? (userReaction === 'Like' ? 'Unlike' : REACTIONS.find(r => r.type === userReaction)?.type || 'Unlike') : 'Like'}
                  </span>
                </li>
                <li style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setIsReplying(!isReplying)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <span>Reply</span>
                </li>
                {activeUser?._id === comment.user?._id && (
                  <>
                    <li style={{ cursor: 'pointer', color: '#1890FF' }} onClick={() => setIsEditing(!isEditing)}>
                      <span>Edit</span>
                    </li>
                    <li style={{ cursor: 'pointer', color: '#ff4d4f' }} onClick={handleDeleteClick}>
                      <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                    </li>
                  </>
                )}
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
             <div style={{ position: 'absolute', left: '-25px', top: '0', bottom: '20px', width: '2px', backgroundColor: '#F0F2F5' }}></div>
             
             {comment.replies.length > visibleReplies && (
                 <div style={{ marginBottom: '10px' }}>
                    <button 
                        className="_view_previous_btn"
                        style={{ fontSize: '12px', padding: '4px 0', display: 'flex', alignItems: 'center', gap: '5px' }}
                        onClick={() => setVisibleReplies(prev => prev + 4)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        View {Math.min(4, comment.replies.length - visibleReplies)} previous replies
                    </button>
                 </div>
             )}

            {comment.replies.slice(-visibleReplies).map(reply => (
              <CommentItem 
                key={reply._id} 
                comment={reply} 
                postId={postId}
                activeUser={activeUser}
                onCommentModified={onCommentModified}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
