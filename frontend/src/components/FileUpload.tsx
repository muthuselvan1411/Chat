import React, { useState, useRef } from 'react';
import { Paperclip, Send, X, File } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File, message?: string) => void;
  isDarkMode: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isDarkMode }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowModal(true);
    }
  };

  const handleSend = () => {
    if (selectedFile) {
      onFileSelect(selectedFile, message);
      setSelectedFile(null);
      setMessage('');
      setShowModal(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setMessage('');
    setShowModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileInput}
        style={{ display: 'none' }}
        accept="image/*,.pdf,.doc,.docx,.txt"
      />
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
      >
        <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>

      {/* SIMPLE MODAL - NO COMPLEX LAYOUTS */}
      {showModal && selectedFile && (
        <div
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: '999999',
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: isDarkMode ? '#1f2937' : 'white',
              color: isDarkMode ? 'white' : 'black',
              margin: '50px auto',
              padding: '0',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
              position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{ 
              padding: '20px', 
              borderBottom: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: '0', fontSize: '18px' }}>Send File</h3>
              <button
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: isDarkMode ? '#9ca3af' : '#6b7280'
                }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
            
            {/* Content */}
            <div style={{ padding: '20px' }}>
              {/* File Preview */}
              {isImage(selectedFile.type) ? (
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '250px',
                      borderRadius: '8px',
                      display: 'block',
                      margin: '0 auto'
                    }}
                  />
                  <p style={{ 
                    marginTop: '10px', 
                    fontSize: '14px', 
                    color: isDarkMode ? '#9ca3af' : '#6b7280' 
                  }}>
                    {selectedFile.name}
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: isDarkMode ? '#374151' : '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <File style={{ width: '32px', height: '32px', color: '#3b82f6' }} />
                  <div>
                    <p style={{ margin: '0', fontWeight: '500' }}>{selectedFile.name}</p>
                    <p style={{ margin: '0', fontSize: '12px', opacity: '0.7' }}>
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}

              {/* Message Input */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message (optional)"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                  borderRadius: '8px',
                  backgroundColor: isDarkMode ? '#374151' : 'white',
                  color: isDarkMode ? 'white' : 'black',
                  resize: 'none',
                  height: '80px',
                  fontFamily: 'inherit',
                  marginBottom: '20px',
                  boxSizing: 'border-box'
                }}
              />

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleClose}
                  style={{
                    flex: '1',
                    padding: '12px',
                    border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: isDarkMode ? 'white' : 'black',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  style={{
                    flex: '1',
                    padding: '12px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Send style={{ width: '16px', height: '16px' }} />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FileUpload;
