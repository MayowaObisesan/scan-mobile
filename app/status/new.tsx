import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, Image, StyleSheet} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {router} from 'expo-router';
import {PageBody, PageContainer, PageHeader, PageHeading} from '~/components/PageSection';

export default function NewStatusScreen() {
  const [statusText, setStatusText] = useState('');
  const [image, setImage] = useState<string | null>(null);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!statusText && !image) {
      alert('Please add text or an image to your status.');
      return;
    }

    // Replace with your backend API call to save the status
    const newStatus = {
      content: image || statusText,
      type: image ? 'image' : 'text',
      timestamp: new Date(),
    };

    console.log('New status:', newStatus);

    // Navigate back to the status page
    router.push('/status');
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageHeading>Create Status</PageHeading>
      </PageHeader>

      <PageBody>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your status here..."
            value={statusText}
            onChangeText={setStatusText}
            multiline
          />
        </View>

        {image && (
          <Image source={{uri: image}} style={styles.imagePreview}/>
        )}

        <TouchableOpacity style={styles.imageButton} onPress={handlePickImage}>
          <Text style={styles.imageButtonText}>Pick an Image</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Post Status</Text>
        </TouchableOpacity>
      </PageBody>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 20,
  },
  imageButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
