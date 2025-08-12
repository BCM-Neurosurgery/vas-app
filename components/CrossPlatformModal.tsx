import { IconSymbol } from '@/components/ui/IconSymbol';
import { useEffect } from 'react';
import { Modal, Platform, Text, TouchableOpacity, View } from 'react-native';

interface CrossPlatformModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showCloseButton?: boolean;
  animationType?: 'none' | 'slide' | 'fade';
  presentationStyle?: 'fullScreen' | 'pageSheet' | 'formSheet' | 'overFullScreen';
}

export default function CrossPlatformModal({
  visible,
  onClose,
  children,
  title,
  showCloseButton = true,
  animationType = 'slide',
  presentationStyle = 'pageSheet',
}: CrossPlatformModalProps) {
  // Add keyboard support for web
  useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, onClose]);

  // On web, use different modal behavior
  if (Platform.OS === 'web') {
    if (!visible) return null;

    return (
      <View className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        {/* Backdrop - click to close */}
        <TouchableOpacity
          className="absolute inset-0 modal-backdrop"
          onPress={onClose}
          activeOpacity={1}
        />
        
        {/* Modal content */}
        <View className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden border border-gray-200 modal-content">
          {/* Header with close button */}
          {(title || showCloseButton) && (
            <View className="flex-row justify-between items-center p-5 border-b border-gray-200 bg-gray-50">
              {title && (
                <Text className="text-xl font-bold text-medical-text-primary">{title}</Text>
              )}
              {showCloseButton && (
                <TouchableOpacity
                  onPress={onClose}
                  className="p-2 -m-2 hover:bg-gray-200 rounded-lg transition-colors"
                  style={{ 
                    minWidth: 40, 
                    minHeight: 40, 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: Platform.OS === 'web' ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                  }}
                >
                  <IconSymbol name="xmark" size={20} color="#666" />
                  {/* Subtle indicator for web */}
                  {Platform.OS === 'web' && (
                    <Text style={{ 
                      fontSize: 8, 
                      color: '#999', 
                      marginTop: 2,
                      fontWeight: '500'
                    }}>
                      CLOSE
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* Content */}
          <View className="p-5">
            {children}
          </View>
        </View>
      </View>
    );
  }

  // On mobile, use React Native Modal
  return (
    <Modal
      visible={visible}
      animationType={animationType}
      presentationStyle={presentationStyle}
      onRequestClose={onClose}
    >
      {children}
    </Modal>
  );
}
