'use client';

import { useState, useRef, useEffect } from 'react';
import { getImageUrl } from '@/utils/media';
import CommentItem from './CommentItem';
import { toggleLikeAction, getLikersAction, getCommentsAction, addCommentAction } from '@/app/actions/interactionActions';
import { deletePostAction, updatePostAction } from '@/app/actions/postActions';
import { useToast } from './ToastProvider';
import ConfirmationModal from './ConfirmationModal';
import LikersModal from './LikersModal';
import EditPostModal from './EditPostModal';

const REACTIONS = [
  { type: 'Like', icon: '👍', color: '#1890FF' },
  { type: 'Love', icon: '❤️', color: '#f9197f' },
  { type: 'Haha', icon: '😆', color: '#ffb900' },
  { type: 'Wow', icon: '😮', color: '#ffb900' },
  { type: 'Sad', icon: '😢', color: '#ffb900' },
  { type: 'Angry', icon: '😡', color: '#f05d51' },
];

const timeAgo = (date) => {
  if (!date) return "some time ago";
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  return Math.floor(seconds) + " seconds ago";
};

// Helper to build a nested reply tree from a flat array
const buildCommentTree = (comments) => {
  const commentMap = {};
  const roots = [];

  // First pass: map each comment and ensure it has a replies array
  comments.forEach(comment => {
    commentMap[comment._id] = { ...comment, replies: [] };
  });

  // Second pass: hook children to parents
  comments.forEach(comment => {
    if (comment.parentComment) {
      if (commentMap[comment.parentComment]) {
        commentMap[comment.parentComment].replies.push(commentMap[comment._id]);
      } else {
        roots.push(commentMap[comment._id]);
      }
    } else {
      roots.push(commentMap[comment._id]);
    }
  });

  return roots;
};

export default function FeedPost({ _id, user, activeUser, createdAt, content, mediaUrl, visibility = 'public', likesCount: initialLikesCount = 0, commentsCount: initialCommentsCount = 0, shares = 0 }) {

  const [mounted, setMounted] = useState(false);
  const toast = useToast();

  // Interaction States
  const [userReaction, setUserReaction] = useState(null); // 'Like', 'Love', etc. or null
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [likersList, setLikersList] = useState([]);
  const [commentsList, setCommentsList] = useState([]);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const [commentsFetched, setCommentsFetched] = useState(false);

  // Comment Form States
  const [commentInput, setCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown States
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [hoveringLike, setHoveringLike] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState(null);

  // Edit Post Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [localContent, setLocalContent] = useState(content);
  const [localMediaUrl, setLocalMediaUrl] = useState(null);

  // Pagination for comments
  const [visibleComments, setVisibleComments] = useState(2);

  // General Mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const [reactionCounts, setReactionCounts] = useState({});

  // Fetch Likers 
  useEffect(() => {
    let isMounted = true;
    async function checkLikers() {
      if (!_id) return;
      const res = await getLikersAction(_id, 'Post');
      if (res.success && isMounted) {
        if (activeUser?._id) {
          const currentUserLiker = res.likers.find(liker =>
            liker.user?._id === activeUser._id || liker.user === activeUser._id
          );
          setUserReaction(currentUserLiker ? currentUserLiker.reactionType : null);
        }
        setLikersList(res.likers.slice(0, 9));
        setReactionCounts(res.countsByReaction || {});
      }
    }
    checkLikers();
    return () => { isMounted = false; };
  }, [_id, activeUser?._id]);

  // Fetch Comments
  useEffect(() => {
    let isMounted = true;
    async function fetchComments() {
      if (!_id) return;
      const res = await getCommentsAction(_id);
      if (res.success && isMounted) {
        setCommentsList(buildCommentTree(res.comments));
        setCommentsCount(res.comments.length);
        setCommentsFetched(true);
      }
    }
    fetchComments();
    return () => { isMounted = false; };
  }, [_id]);

  // Handle Outside Click for Dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleVisibilityToggle = async () => {
    const nextVisibility = visibility === 'public' ? 'private' : 'public';
    const res = await updatePostAction(_id, { visibility: nextVisibility });
    if (res.success) {
      toast.success(`Post is now ${nextVisibility === 'private' ? 'Only Me' : 'Public'}`);
    } else {
      toast.error(res.error || 'Failed to update visibility');
    }
    setDropdownOpen(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
    setDropdownOpen(false);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    const res = await deletePostAction(_id);
    if (!res.success) {
      toast.error(res.error);
    } else {
      toast.success('Post deleted');
    }
  };

  const author = (user?.firstName && user?.lastName)
    ? `${user.firstName} ${user.lastName}`
    : (user?.username || 'Unknown');
  const authorImg = getImageUrl(user?.profilePic) || '/images/user_avatar.svg';
  const time = mounted ? timeAgo(createdAt) : 'Just now';
  const image = getImageUrl(mediaUrl);
  const isOwner = activeUser?._id === (user?._id || user);

  const handleLike = async (reactionType = 'Like') => {
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

    const res = await toggleLikeAction(_id, 'Post', reactionType);
    if (res.success) {
      const likersRes = await getLikersAction(_id, 'Post');
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
    // If already reacted, clicking the button un-reacts (toggles off)
    // If not reacted, clicking performs a standard 'Like'
    handleLike(userReaction || 'Like');
  };

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
      setHoveringLike(true);
    }, 500); // 0.5s hover
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setHoveringLike(false);
  };

  const handleEditModalClose = (saved, newContent, newMediaUrl) => {
    setShowEditModal(false);
    if (saved) {
      if (newContent !== undefined) setLocalContent(newContent);
      if (newMediaUrl !== undefined) setLocalMediaUrl(newMediaUrl);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentInput.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const res = await addCommentAction(_id, commentInput);
    if (res.success) {
      setCommentsList(prev => [...prev, { ...res.comment, replies: [] }]);
      setCommentsCount(prev => prev + 1);
      setCommentInput('');
    }
    setIsSubmitting(false);
  };

  const handleCommentModified = () => {
    async function refetch() {
      const res = await getCommentsAction(_id);
      if (res.success) {
        setCommentsList(buildCommentTree(res.comments));
        setCommentsCount(res.comments.length);
      }
    }
    refetch();
  };

  return (
    <>
    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16">
      <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
        <div className="_feed_inner_timeline_post_top">
          <div className="_feed_inner_timeline_post_box">
            <div className="_feed_inner_timeline_post_box_image">
              <img src={authorImg} alt="" className="_post_img" />
            </div>
            <div className="_feed_inner_timeline_post_box_txt">
              <h4 className="_feed_inner_timeline_post_box_title">{author}</h4>
              <p className="_feed_inner_timeline_post_box_para" style={{ display: 'flex', alignItems: 'center' }}>
                {time} <span style={{ margin: '0 5px' }}>.</span>
                <span className="_post_visibility_label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {visibility === 'private' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="Private">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="Public">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                  )}
                  <span style={{ fontSize: '12px' }}>{visibility === 'private' ? 'Only Me' : 'Public'}</span>
                </span>
              </p>
            </div>
          </div>

          <div className="_feed_inner_timeline_post_box_dropdown" ref={dropdownRef}>
            <div className="_feed_timeline_post_dropdown">
              <button
                id="_timeline_show_drop_btn"
                className="_feed_timeline_post_dropdown_link"
                onClick={() => setDropdownOpen(prev => !prev)}
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="4" height="17" fill="none" viewBox="0 0 4 17">
                  <circle cx="2" cy="2" r="2" fill="#C4C4C4" />
                  <circle cx="2" cy="8" r="2" fill="#C4C4C4" />
                  <circle cx="2" cy="15" r="2" fill="#C4C4C4" />
                </svg>
              </button>
            </div>

            {dropdownOpen && (
              <div className="_feed_timeline_dropdown show">
                <ul className="_feed_timeline_dropdown_list">
                  <li className="_feed_timeline_dropdown_item">
                    <button className="_feed_timeline_dropdown_link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}>
                      <span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
                          <path stroke="#1890FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M14.25 15.75L9 12l-5.25 3.75v-12a1.5 1.5 0 011.5-1.5h7.5a1.5 1.5 0 011.5 1.5v12z" />
                        </svg>
                      </span>
                      Save Post
                    </button>
                  </li>
                  {isOwner && (
                    <>
                      <li className="_feed_timeline_dropdown_item">
                        <button onClick={() => { setShowEditModal(true); setDropdownOpen(false); }} className="_feed_timeline_dropdown_link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}>
                          <span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1890FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </span>
                          Edit Post
                        </button>
                      </li>
                      <li className="_feed_timeline_dropdown_item">
                        <button onClick={handleVisibilityToggle} className="_feed_timeline_dropdown_link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}>
                          <span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#1890FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              {visibility === 'public' ? (
                                <>
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </>
                              ) : (
                                <>
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="2" y1="12" x2="22" y2="12"></line>
                                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                </>
                              )}
                            </svg>
                          </span>
                          Make it {visibility === 'public' ? 'Private' : 'Public'}
                        </button>
                      </li>
                      <li className="_feed_timeline_dropdown_item">
                        <button onClick={handleDeleteClick} className="_feed_timeline_dropdown_link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', color: '#ff4d4f' }}>
                          <span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#ff4d4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </span>
                          Delete Post
                        </button>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>

          <ConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleConfirmDelete}
            title="Delete Post"
            message="Are you sure you want to delete this post? This action cannot be undone."
            confirmText="Delete"
          />

          <LikersModal
            isOpen={showLikersModal}
            onClose={() => setShowLikersModal(false)}
            targetId={_id}
            targetType="Post"
          />
        </div>

        <h4 className="_feed_inner_timeline_post_title">{localContent || content}</h4>

        {(localMediaUrl !== null ? localMediaUrl : image) && (
          <div className="_feed_inner_timeline_image">
            <img src={localMediaUrl !== null ? getImageUrl(localMediaUrl) : image} alt="" className="_time_img" />
          </div>
        )}
      </div>

      <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26">
        {likesCount > 0 ? (
          <div
            className="_feed_inner_timeline_total_reacts_image"
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setShowLikersModal(true)}
          >
            <div className="_reaction_summary_images" style={{ display: 'flex', alignItems: 'center' }}>
              {likersList?.map((liker, index) => {
                const imgClass = index === 0 ? '_react_img1' : (index > 2 ? '_react_img _rect_img_mbl_none' : '_react_img');
                return (
                  <img
                    key={liker._id || index}
                    src={getImageUrl(liker.user?.profilePic) || "/images/user_avatar.svg"}
                    alt={liker.user?.username || 'User'}
                    title={liker.user?.username}
                    className={imgClass}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', marginLeft: index > 0 ? '-10px' : '0', zIndex: 10 - index }}
                  />
                );
              })}
            </div>
            <p className="_feed_inner_timeline_total_reacts_para" style={{ marginLeft: likersList.length > 0 ? '8px' : '0' }}>
              {likesCount > 9 ? '9+' : likesCount}
            </p>
          </div>
        ) : (
          <p className="_feed_inner_timeline_total_reacts_para">0</p>
        )}

        <div className="_feed_inner_timeline_total_reacts_txt">
          <p className="_feed_inner_timeline_total_reacts_para1">
            <a href="#0" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{commentsCount}</span> Comment(s)
            </a>
          </p>
          <p className="_feed_inner_timeline_total_reacts_para2" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>{shares}</span> Share
          </p>
        </div>
      </div>

      <div className="_feed_inner_timeline_reaction">
        <div style={{ position: 'relative' }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          {hoveringLike && (
            <div className="_reaction_picker_wrap" onMouseEnter={() => setHoveringLike(true)}>
              {REACTIONS.map(reac => (
                <span
                  key={reac.type}
                  className="_reaction_item"
                  onClick={() => handleLike(reac.type)}
                  title={reac.type}
                >
                  {reac.icon}
                  <span className="_reaction_name_tooltip">{reac.type}</span>
                </span>
              ))}
            </div>
          )}
          <button
            className={`_feed_inner_timeline_reaction_emoji _feed_reaction ${userReaction ? '_feed_reaction_active' : ''}`}
            onClick={handleMainButtonClick}
          >
            <span className="_feed_inner_timeline_reaction_link">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {userReaction ? (
                  <>
                    <span style={{ fontSize: '20px' }}>{REACTIONS.find(r => r.type === userReaction)?.icon}</span>
                    <span style={{ color: REACTIONS.find(r => r.type === userReaction)?.color || '#1890FF', fontWeight: 'bold' }}>{userReaction}</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                    </svg>
                    <span>Like</span>
                  </>
                )}
              </span>
            </span>
          </button>
        </div>

        <button className="_feed_inner_timeline_reaction_comment _feed_reaction">
          <span className="_feed_inner_timeline_reaction_link">
            <span>
              <svg className="_reaction_svg" xmlns="http://www.w3.org/2000/svg" width="21" height="21" fill="none" viewBox="0 0 21 21">
                <path stroke="#000" d="M1 10.5c0-.464 0-.696.009-.893A9 9 0 019.607 1.01C9.804 1 10.036 1 10.5 1v0c.464 0 .696 0 .893.009a9 9 0 018.598 8.598c.009.197.009.429.009.893v6.046c0 1.36 0 2.041-.317 2.535a2 2 0 01-.602.602c-.494.317-1.174.317-2.535.317H10.5c-.464 0-.696 0-.893-.009a9 9 0 01-8.598-8.598C1 11.196 1 10.964 1 10.5v0z" />
                <path stroke="#000" strokeLinecap="round" strokeLinejoin="round" d="M6.938 9.313h7.125M10.5 14.063h3.563" />
              </svg>
              Comment
            </span>
          </span>
        </button>

        <button className="_feed_inner_timeline_reaction_share _feed_reaction">
          <span className="_feed_inner_timeline_reaction_link">
            <span>
              <svg className="_reaction_svg" xmlns="http://www.w3.org/2000/svg" width="24" height="21" fill="none" viewBox="0 0 24 21">
                <path stroke="#000" strokeLinejoin="round" d="M23 10.5L12.917 1v5.429C3.267 6.429 1 13.258 1 20c2.785-3.52 5.248-5.429 11.917-5.429V20L23 10.5z" />
              </svg>
              Share
            </span>
          </span>
        </button>
      </div>

      <div className="_feed_inner_timeline_cooment_area" style={{ marginBottom: "20px" }}>
        <div className="_feed_inner_comment_box">
          <form className="_feed_inner_comment_box_form" onSubmit={handleCommentSubmit} style={{ alignItems: "center" }}>
            <div className="_feed_inner_comment_box_content" style={{ flex: 1, border: '1px solid #E4E6EB', borderRadius: '20px', padding: '2px 10px', display: 'flex', alignItems: 'center' }}>
              <div className="_feed_inner_comment_box_content_image">
                <img src={getImageUrl(activeUser?.profilePic) || "/images/user_avatar.svg"} alt="" className="_comment_img" />
              </div>
              <div className="_feed_inner_comment_box_content_txt" style={{ flex: 1 }}>
                <input
                  type="text"
                  className="form-control _comment_textarea"
                  placeholder="Write a comment..."
                  style={{ minHeight: 'auto', padding: '8px 5px', border: 'none', boxShadow: 'none' }}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="_feed_inner_comment_box_icon">
              <button type="submit" disabled={isSubmitting || !commentInput.trim()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1890FF', fontWeight: 'bold', marginLeft: '10px' }}>
                {isSubmitting ? '...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {commentsList.length > 0 && (
        <div className="_timline_comment_main">
          {commentsList.length > visibleComments && (
            <div className="_pagination_wrap">
              <button
                className="_view_previous_btn"
                onClick={() => setVisibleComments(prev => prev + 4)}
              >
                View {Math.min(4, commentsList.length - visibleComments)} previous comments
              </button>
            </div>
          )}

          <div style={{ padding: '0 24px' }}>
            {commentsList.slice(-visibleComments).map(comment => (
              <CommentItem
                key={comment._id}
                comment={comment}
                postId={_id}
                activeUser={activeUser}
                onCommentModified={handleCommentModified}
              />
            ))}
          </div>
        </div>
      )}
    </div>

    <EditPostModal
      isOpen={showEditModal}
      onClose={handleEditModalClose}
      post={{ _id, user, content: localContent || content, mediaUrl }}
    />
    </>
  );
}
