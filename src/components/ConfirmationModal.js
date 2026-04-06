'use client';

import React from 'react';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Are you sure?", 
  message = "This action cannot be undone.", 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "danger" // danger, primary, warning
}) => {
  if (!isOpen) return null;

  return (
    <div className="_confirmation_modal_overlay">
      <div className="_confirmation_modal_container">
        <div className="_confirmation_modal_header">
          <h4 className="_confirmation_modal_title">{title}</h4>
          <button className="_confirmation_modal_close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="_confirmation_modal_body">
          <p className="_confirmation_modal_message">{message}</p>
        </div>
        <div className="_confirmation_modal_footer">
          <button 
            type="button" 
            className="_confirmation_modal_btn _btn_cancel" 
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className={`_confirmation_modal_btn _btn_confirm _btn_${type}`} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
