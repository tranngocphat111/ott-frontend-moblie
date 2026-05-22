import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface CreatePollModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    question: string;
    options: { id: string; name: string; voters: string[] }[];
    multipleChoice: boolean;
  }) => void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState([
    { id: String(Date.now() + 1), value: '' },
    { id: String(Date.now() + 2), value: '' },
  ]);
  const [multipleChoice, setMultipleChoice] = useState(false);

  const CHAT_BROWN = '#d2a177';

  useEffect(() => {
    if (visible) {
      setQuestion('');
      setOptions([
        { id: String(Date.now() + 1), value: '' },
        { id: String(Date.now() + 2), value: '' },
      ]);
      setMultipleChoice(false);
    }
  }, [visible]);

  const handleAddOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, { id: String(Date.now() + options.length), value: '' }]);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions(options.filter((opt) => opt.id !== id));
  };

  const handleOptionChange = (id: string, value: string) => {
    setOptions(
      options.map((opt) => (opt.id === id ? { ...opt, value } : opt)),
    );
  };

  const isFormValid =
    question.trim().length > 0 &&
    options.filter((opt) => opt.value.trim().length > 0).length >= 2;

  const handleSubmit = () => {
    if (!isFormValid) return;

    const validOptions = options
      .filter((opt) => opt.value.trim().length > 0)
      .map((opt) => ({ id: opt.id, name: opt.value.trim(), voters: [] }));

    onSubmit({
      question: question.trim(),
      options: validOptions,
      multipleChoice,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="bg-white rounded-t-[32px] overflow-hidden max-h-[90%]">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-5 border-b border-slate-100">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 rounded-full bg-orange-50 items-center justify-center">
                <Feather name="bar-chart-2" size={20} color={CHAT_BROWN} />
              </View>
              <Text className="text-[18px] font-bold text-slate-900">Tạo bình chọn</Text>
            </View>
            <Pressable onPress={onClose} className="p-2 bg-slate-50 rounded-full">
              <Feather name="x" size={20} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView className="max-h-[500px] px-6 py-4" keyboardShouldPersistTaps="handled">
            {/* Question */}
            <View className="mb-6">
              <Text className="mb-2 text-[13px] font-bold uppercase tracking-wider text-slate-500">Câu hỏi</Text>
              <TextInput
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-[16px] text-slate-900"
                placeholder="Bạn muốn hỏi mọi người điều gì?"
                placeholderTextColor="#94a3b8"
                multiline
                value={question}
                onChangeText={setQuestion}
                style={{ minHeight: 80 }}
                textAlignVertical="top"
              />
            </View>

            {/* Options */}
            <View className="mb-4">
              <Text className="mb-2 text-[13px] font-bold uppercase tracking-wider text-slate-500">Lựa chọn</Text>
              <View className="gap-3">
                {options.map((opt, index) => (
                  <View key={opt.id} className="flex-row items-center gap-3">
                    <View className="flex-1 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <TextInput
                        className="flex-1 text-[15px] text-slate-900"
                        placeholder={`Lựa chọn ${index + 1}`}
                        placeholderTextColor="#cbd5e1"
                        value={opt.value}
                        onChangeText={(val) => handleOptionChange(opt.id, val)}
                      />
                      {options.length > 2 && (
                        <Pressable onPress={() => handleRemoveOption(opt.id)} className="ml-2">
                          <Feather name="trash-2" size={18} color="#ef4444" />
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {options.length < 10 && (
                <Pressable
                  onPress={handleAddOption}
                  className="mt-4 flex-row items-center justify-center rounded-2xl border border-dashed border-slate-300 py-4"
                >
                  <Feather name="plus" size={18} color="#64748b" />
                  <Text className="ml-2 text-[14px] font-semibold text-slate-600">Thêm lựa chọn</Text>
                </Pressable>
              )}
            </View>

            {/* Settings */}
            <View className="mt-4 mb-8 flex-row items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
              <View className="flex-row items-center gap-3">
                <Feather name="check-square" size={20} color="#64748b" />
                <Text className="text-[15px] font-medium text-slate-700">Chọn nhiều đáp án</Text>
              </View>
              <Switch
                value={multipleChoice}
                onValueChange={setMultipleChoice}
                trackColor={{ false: '#e2e8f0', true: '#f5e8dc' }}
                thumbColor={multipleChoice ? CHAT_BROWN : '#f8fafc'}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="px-6 py-6 border-t border-slate-100 bg-slate-50">
            <Pressable
              onPress={handleSubmit}
              disabled={!isFormValid}
              className={`h-14 w-full items-center justify-center rounded-2xl shadow-sm ${isFormValid ? 'bg-[#d2a177]' : 'bg-slate-300'
                }`}
              style={isFormValid ? { backgroundColor: CHAT_BROWN } : undefined}
            >
              <Text className="text-[16px] font-bold text-white">Đăng bình chọn</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
