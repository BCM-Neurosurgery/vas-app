import { IconSymbol } from '@/components/ui/IconSymbol';
import {
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface SurveyType {
    id: string;
    name: string;
    description: string;
    icon: 'house.fill' | 'paperplane.fill' | 'chevron.left.forwardslash.chevron.right' | 'chevron.right';
    color: string;
    estimatedTime: string;
    disabled?: boolean;
  }
  
interface QuickStartProps {
    patientName: string;
    onStartSurvey: (surveyType: SurveyType) => void;
}

export default function QuickStart({ patientName, onStartSurvey }: QuickStartProps) {
    const surveyTypes: SurveyType[] = [
        {
          id: 'depression',
          name: 'Depression Screening',
          description: 'Quick assessment for depressive symptoms',
          icon: 'house.fill',
          color: '#FF6B6B',
          estimatedTime: '5-10 min',
          disabled: false, // This is our MVP survey
        },
        {
          id: 'anxiety',
          name: 'Anxiety Assessment',
          description: 'Comprehensive anxiety evaluation',
          icon: 'paperplane.fill',
          color: '#4ECDC4',
          estimatedTime: '8-12 min',
          disabled: true, // Coming soon
        },
        {
          id: 'comprehensive',
          name: 'Comprehensive Assessment',
          description: 'Full mental health evaluation',
          icon: 'chevron.left.forwardslash.chevron.right',
          color: '#45B7D1',
          estimatedTime: '15-20 min',
          disabled: true, // Coming soon
        },
        {
          id: 'suicide',
          name: 'Suicide Risk Assessment',
          description: 'Critical safety evaluation',
          icon: 'chevron.right',
          color: '#FF9500',
          estimatedTime: '10-15 min',
          disabled: true, // Coming soon
        },
      ];

    const renderSurveyCard = (surveyType: SurveyType) => (
        <TouchableOpacity
          key={surveyType.id}
          className={`rounded-xl p-5 mb-4 shadow-sm ${
            surveyType.disabled 
              ? 'bg-gray-100 opacity-60' 
              : 'bg-white'
          }`}
          onPress={() => onStartSurvey(surveyType)}
          disabled={surveyType.disabled}
        >
          <View className="flex-row items-center mb-3">
            <View 
              className={`w-12 h-12 rounded-full justify-center items-center mr-4 ${
                surveyType.disabled ? 'bg-gray-400' : ''
              }`}
              style={{ 
                backgroundColor: surveyType.disabled ? '#9CA3AF' : surveyType.color 
              }}
            >
              <IconSymbol 
                name={surveyType.icon} 
                size={24} 
                color={surveyType.disabled ? '#6B7280' : 'white'} 
              />
            </View>
            <View className="flex-1">
              <Text className={`text-base font-semibold mb-1 ${
                surveyType.disabled 
                  ? 'text-gray-500' 
                  : 'text-medical-text-primary'
              }`}>
                {surveyType.name}
              </Text>
              <Text className={`text-xs ${
                surveyType.disabled 
                  ? 'text-gray-400' 
                  : 'text-medical-text-secondary'
              }`}>
                {surveyType.estimatedTime}
              </Text>
            </View>
            <View className="flex-row items-center">
              {surveyType.disabled && (
                <Text className="text-xs text-gray-400 mr-2 font-medium">Coming Soon</Text>
              )}
              <IconSymbol 
                name="chevron.right" 
                size={20} 
                color={surveyType.disabled ? '#D1D5DB' : '#ccc'} 
              />
            </View>
          </View>
          
          <Text className={`text-sm leading-5 ${
            surveyType.disabled 
              ? 'text-gray-400' 
              : 'text-medical-text-secondary'
          }`}>
            {surveyType.description}
          </Text>
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-medical-gray">
          <View className="p-5 bg-white border-b border-medical-gray-medium">
            <Text className="text-2xl font-bold text-medical-text-primary mb-1">Quick Start</Text>
            <Text className="text-sm text-medical-text-secondary">
              Select a survey type to begin assessment for {patientName}
            </Text>
          </View>
    
          <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
            <View className="mb-8">
              {surveyTypes.map(renderSurveyCard)}
            </View>
    
            <View className="mb-5">
              <View className="bg-white rounded-xl p-5 shadow-sm">
                <IconSymbol name="info.circle.fill" size={20} color="#007AFF" />
                <Text className="text-base font-semibold text-medical-text-primary mt-3 mb-2">About CAT-MH</Text>
                <Text className="text-sm text-medical-text-secondary leading-5">
                  Computerized Adaptive Testing for Mental Health provides precise, 
                  efficient assessments that adapt to patient responses.
                </Text>
              </View>
            </View>
    
            {/* MVP Notice */}
            <View className="mb-5">
              <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <Text className="text-sm font-medium text-blue-800 mb-1">MVP Version</Text>
                <Text className="text-xs text-blue-600 leading-4">
                  Currently supporting Depression Screening only. Additional survey types will be available in future updates.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      );
}