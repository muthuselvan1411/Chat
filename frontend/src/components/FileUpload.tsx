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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('📁 File selected:', file.name, file.type, file.size);
      
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      setShowModal(true);
    }
  };

  const handleSend = async () => {
    if (!selectedFile) return;
    
    try {
      setIsUploading(true);
      console.log('📤 Sending file:', selectedFile.name);
      
      await onFileSelect(selectedFile, message.trim() || undefined);
      
      console.log('✅ File sent successfully');
      
      setSelectedFile(null);
      setMessage('');
      setShowModal(false);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('❌ Error sending file:', error);
      alert('Failed to send file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setMessage('');
    setShowModal(false);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isImage = (type: string) => type.startsWith('image/');
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
        className="floating-button"
        title="Upload file"
        disabled={isUploading}
      >
        <Paperclip className="w-5 h-5" />
      </button>

      {/* Fixed Modal Positioning - Above Message Bar */}
      {showModal && selectedFile && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={handleClose}
          />
          
          {/* Modal positioned above message bar */}
          <div 
            className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md mx-4"
            style={{
              bottom: '120px' // Adjust this value based on your message input height
            }}
          >
            <div 
              className={`rounded-2xl shadow-2xl border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
              style={{
                maxHeight: '70vh',
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-4 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <h3 className="text-lg font-semibold">Send File</h3>
                <button
                  onClick={handleClose}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                  }`}
                  disabled={isUploading}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-4 space-y-4" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                {/* File Preview */}
                {isImage(selectedFile.type) ? (
                  <div className="text-center">
                    <div className="relative inline-block">
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="Preview"
                        className="max-w-full rounded-xl shadow-lg"
                        style={{ maxHeight: '200px', width: 'auto' }}
                      />
                    </div>
                    <p className="mt-3 text-sm font-medium">
                      {selectedFile.name}
                    </p>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                ) : (
                  <div className={`flex items-center gap-4 p-4 rounded-xl ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <File className="w-8 h-8 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Message Input */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Add a message (optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className={`w-full px-4 py-3 rounded-xl resize-none transition-all duration-200 ${
                      isDarkMode 
                        ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                        : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    } focus:ring-2 focus:ring-blue-500/20 focus:outline-none`}
                    rows={3}
                    maxLength={500}
                    disabled={isUploading}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className={`p-4 border-t ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                      isDarkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                    disabled={isUploading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default FileUpload;
