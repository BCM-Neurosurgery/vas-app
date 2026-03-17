// components/SettingsPasswordModal.tsx
import CrossPlatformModal from '@/components/CrossPlatformModal';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

interface SettingsPasswordModalProps {
    visible: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    adminPassword?: string | null; // expected password from env
    title?: string;
    message?: string;
    submitLabel?: string;
  }

export default function SettingsPasswordModal({
    visible, 
    onCancel,
    onSuccess,
    adminPassword,
    title = 'Admin Settings',
    message = 'Enter the admin password to access settings.',
    submitLabel = 'Unlock',
}: SettingsPasswordModalProps) {
    const [passwordInput, setPasswordInput] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = () => {
        // If called w/out password, allow success
        if (!adminPassword) {
            setPasswordInput('');
            setError(null);
            onSuccess();
            return;
        }

        if (passwordInput === adminPassword) {
            setPasswordInput('');
            setError(null);
            onSuccess();
        } else {
            setError('Incorrect password');
        }
    };

    const handleClose = () => {
        setPasswordInput('');
        setError(null);
        onCancel();
    };

    return (
        <CrossPlatformModal
            visible={visible}
            onClose={handleClose}
            title={title}
            showCloseButton={true}
            animationType="fade"
            >
            {/* This wrapper forces true centering */}
            <View className="flex-1 w-full items-center justify-center px-4">

                {/* Card */}
                <View className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-md">
                <Text className="text-center text-gray-600 text-base mb-6">
                    {message}
                </Text>

                <TextInput
                    secureTextEntry
                    placeholder="Password"
                    value={passwordInput}
                    onChangeText={(text) => {
                    setPasswordInput(text);
                    if (error) setError(null);
                    }}
                    className="
                    w-full
                    border border-gray-300
                    rounded-xl
                    px-4 py-3
                    text-base
                    bg-gray-50
                    "
                />

                {error && (
                    <Text className="text-red-500 text-sm mt-2 text-center">
                    {error}
                    </Text>
                )}

                <View className="flex-row justify-center mt-6 space-x-3">
                    <TouchableOpacity
                    onPress={handleClose}
                    className="
                        flex-1
                        rounded-xl
                        bg-gray-200
                        py-3
                        items-center
                    "
                    >
                    <Text className="text-gray-800 font-semibold text-base">
                        Cancel
                    </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                    onPress={handleSubmit}
                    className="
                        flex-1
                        rounded-xl
                        bg-blue-600
                        py-3
                        items-center
                    "
                    >
                    <Text className="text-white font-semibold text-base">
                        {submitLabel}
                    </Text>
                    </TouchableOpacity>
                </View>
                </View>
            </View>
        </CrossPlatformModal>
      );
}
