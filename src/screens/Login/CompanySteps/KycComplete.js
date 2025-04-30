import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DocumentPicker from 'react-native-document-picker';
import { launchCamera } from 'react-native-image-picker';
import DropDownPicker from 'react-native-dropdown-picker';
import { API_ENDPOINTS } from '../../../api/apiConfig';
import { useSelector } from 'react-redux';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

const { width, height } = Dimensions.get('window');

// Maximum allowed file uploads
const MAX_FILES = 2;

const KycScreen = () => {
  const navigation = useNavigation();
  const isMounted = useRef(true);
  const companyData = useSelector((state) => state.companyDetail);

  // User and company state
  const [userId, setUserId] = useState(null);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [gstNumber, setGstNumber] = useState('');

  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Dropdown state
  const [open, setOpen] = useState(false);
  const [proofType, setProofType] = useState(null);
  const [items] = useState([
    { label: 'Aadhar Card', value: 'aadhar' },
    { label: 'Pan Card', value: 'pan' },
    { label: 'Voter ID', value: 'voter' },
  ]);

  // Handle cleanup when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load user data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
      return () => {};
    }, [])
  );

  // Check if form is valid for submission
  const isFormValid = proofType && uploadedFiles.length > 0 && gstNumber.trim().length === 15;

  const fetchUserData = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) {
        Alert.alert('Error', 'User not logged in');
        navigation.navigate('Login');
        return;
      }

      const parsedUserId = parseInt(storedUserId, 10);
      setUserId(parsedUserId);

      // Fetch company logo
      fetchCompanyLogo(parsedUserId);
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Could not retrieve user information');
    }
  };

  const fetchCompanyLogo = async (uid) => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.DOCS}?user_id=${uid}`);
      if (response.data.status === 'success' && isMounted.current) {
        setCompanyLogo(response.data.data.comp_url);
      }
    } catch (error) {
      console.error('Error fetching company logo:', error);
    }
  };

  const validateForm = () => {
    if (!proofType) {
      Alert.alert('Missing Information', 'Please select a Name and Address Proof Type');
      return false;
    }

    if (uploadedFiles.length === 0) {
      Alert.alert('Missing Information', 'Please upload at least one proof document');
      return false;
    }

    if (!gstNumber || gstNumber.trim().length !== 15) {
      Alert.alert('Invalid GST Number', 'Please enter a valid 15-digit GST Number');
      return false;
    }

    return true;
  };

  const uploadDocument = async (file, docType) => {
    if (!userId) return null;

    try {
      const payload = {
        user_id: userId,
        type: docType || proofType,
        file_name: file.name,
        mime_type: file.type,
        blob_file: file.data,
      };

      const response = await axios.post(API_ENDPOINTS.DOCS, payload);

      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Upload failed');
      }

      return response.data;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  };

  const updateUserProgress = async () => {
    try {
      // Get current step
      const getStepsResponse = await axios.get(`${API_ENDPOINTS.STEP}?user_id=${userId}`);
      if (getStepsResponse.data.status !== 'success') {
        throw new Error('Could not retrieve user progress');
      }

      // Update step
      const currentStep = +getStepsResponse.data.data.steps;
      const postStepResponse = await axios.post(API_ENDPOINTS.STEP, {
        user_id: userId,
        steps: currentStep + 1,
      });

      if (postStepResponse.data.status !== 'success') {
        throw new Error('Could not update user progress');
      }

      return true;
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  };

  const handleKycAndCompanyRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Step 1: Upload documents in parallel
      const uploadPromises = uploadedFiles.map((file) => uploadDocument(file, 'VD'));
      await Promise.all(uploadPromises);

      // Step 2: Register company
      const companyPayload = {
        ...companyData,
        company_gstin: gstNumber,
        company_logo: companyLogo,
      };

      const companyResponse = await axios.post(API_ENDPOINTS.COMPANY_DETAILS, companyPayload);

      if (companyResponse.data.status !== 'success') {
        throw new Error(companyResponse.data.message || 'Company registration failed');
      }

      const companyId = companyResponse.data.company_id;

      // Step 3: Create employer association
      const employerPayload = {
        user_id: userId,
        company_id: companyId,
        user_company_role: 'Admin',
      };

      const empResponse = await axios.post(API_ENDPOINTS.EMPLOYER, employerPayload);

      if (empResponse.data.status !== 'success') {
        throw new Error(empResponse.data.message || 'Employer registration failed');
      }

      // Step 4: Update user steps
      await updateUserProgress();

      // Success - navigate to next screen
      if (isMounted.current) {
        Alert.alert('Success', 'Registration completed successfully');
        navigation.navigate('Validate');
      }
    } catch (error) {
      if (isMounted.current) {
        console.error('Registration error:', error);
        Alert.alert(
          'Registration Failed',
          error.message || 'Unable to complete registration. Please try again.'
        );
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const readFileAsBase64 = async (uri) => {
    try {
      const filePath = uri.replace('file://', '');
      return await RNFS.readFile(filePath, 'base64');
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  };

  const handleFileUpload = async () => {
    if (uploadedFiles.length >= MAX_FILES) {
      Alert.alert('File Limit Reached', `You can only upload ${MAX_FILES} documents`);
      return;
    }

    try {
      setIsUploading(true);
      const result = await DocumentPicker.pick({
        type: [
          DocumentPicker.types.pdf,
          DocumentPicker.types.images,
          DocumentPicker.types.doc,
          DocumentPicker.types.docx,
        ],
        allowMultiSelection: uploadedFiles.length === 0,
      });

      if (result && result.length > 0) {
        const newFiles = [];
        const availableSlots = MAX_FILES - uploadedFiles.length;
        const filesToProcess = result.slice(0, availableSlots);

        for (const file of filesToProcess) {
          const base64Data = await readFileAsBase64(file.uri);

          const blob = {
            name: file.name,
            type: file.type,
            size: file.size,
            uri: file.uri,
            data: base64Data,
          };
          newFiles.push(blob);
        }

        if (isMounted.current) {
          setUploadedFiles((prev) => [...prev, ...newFiles]);
        }
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled file selection');
      } else {
        console.error('Error uploading file:', err);
        if (isMounted.current) {
          Alert.alert(
            'File Selection Error',
            'There was a problem selecting or processing your file'
          );
        }
      }
    } finally {
      if (isMounted.current) {
        setIsUploading(false);
      }
    }
  };

  const handleOpenCamera = async () => {
    if (uploadedFiles.length >= MAX_FILES) {
      Alert.alert('File Limit Reached', `You can only upload ${MAX_FILES} documents`);
      return;
    }

    const options = {
      mediaType: 'photo',
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.8,
      includeBase64: true,
    };

    try {
      setIsUploading(true);
      launchCamera(options, async (response) => {
        if (response.didCancel) {
          console.log('User cancelled camera');
          if (isMounted.current) setIsUploading(false);
        } else if (response.errorCode) {
          console.log('Camera Error: ', response.errorMessage);
          if (isMounted.current) {
            Alert.alert('Camera Error', response.errorMessage);
            setIsUploading(false);
          }
        } else if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];

          let base64Data = asset.base64;
          if (!base64Data) {
            try {
              base64Data = await readFileAsBase64(asset.uri);
            } catch (error) {
              if (isMounted.current) {
                Alert.alert('Error', 'Failed to process camera image');
                setIsUploading(false);
              }
              return;
            }
          }

          const blob = {
            name: asset.fileName || `camera_image_${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
            size: asset.fileSize,
            uri: asset.uri,
            data: base64Data,
          };

          if (isMounted.current) {
            setUploadedFiles((prev) => {
              const updated = [...prev, blob];
              return updated.slice(0, MAX_FILES);
            });
            setIsUploading(false);
          }
        }
      });
    } catch (error) {
      console.error('Camera handling error:', error);
      if (isMounted.current) {
        Alert.alert('Error', 'Failed to process camera image');
        setIsUploading(false);
      }
    }
  };

  const removeFile = (indexToRemove) => {
    setUploadedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // Memoized render for uploaded files
  const renderUploadedFiles = () => {
    return uploadedFiles.map((file, index) => (
      <View key={index} style={styles.uploadedFileItem}>
        <View style={styles.fileInfoContainer}>
          <Ionicons name="document" size={20} color="#14B6AA" />
          <Text style={styles.uploadedFileName} numberOfLines={1}>
            {file.name || file.uri.split('/').pop()}
          </Text>
        </View>

        {isUploading && (
          <ActivityIndicator size="small" color="#14B6AA" style={styles.uploadStatusIndicator} />
        )}

        <TouchableOpacity
          onPress={() => removeFile(index)}
          disabled={isUploading}
          style={isUploading ? styles.disabledButton : null}
        >
          <Ionicons name="close" size={20} color={isUploading ? '#ccc' : 'red'} />
        </TouchableOpacity>
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Text style={styles.title}>Complete your KYC</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name and Address Proof Type</Text>
            <DropDownPicker
              listMode="SCROLLVIEW"
              scrollViewProps={{ nestedScrollEnabled: true }}
              open={open}
              value={proofType}
              items={items}
              setOpen={setOpen}
              setValue={setProofType}
              placeholder="Select Proof Type"
              style={styles.dropdownStyle}
              dropDownContainerStyle={styles.dropdownContainerStyle}
              placeholderStyle={styles.placeholderStyle}
              zIndex={1000}
              zIndexInverse={1}
            />
          </View>

          <View style={styles.uploadContainer}>
            <Text style={styles.label}>Upload Proof</Text>
            <Text style={styles.subLabel}>
              Upload up to {MAX_FILES} documents in pdf, jpeg or png format with maximum 4MB each
            </Text>

            <TouchableOpacity
              style={[
                styles.fileUploadButton,
                (uploadedFiles.length >= MAX_FILES || isUploading) && styles.disabledButton,
              ]}
              onPress={handleFileUpload}
              disabled={uploadedFiles.length >= MAX_FILES || isUploading}
            >
              <Text style={styles.fileUploadText}>Choose File</Text>
              <Ionicons name="document-outline" size={24} color="#9F9F9F" />
            </TouchableOpacity>

            <View style={styles.cameraButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.cameraUploadButton,
                  (uploadedFiles.length >= MAX_FILES || isUploading) && styles.disabledButton,
                ]}
                onPress={handleOpenCamera}
                disabled={uploadedFiles.length >= MAX_FILES || isUploading}
              >
                <Text
                  style={[
                    styles.cameraUploadText,
                    (uploadedFiles.length >= MAX_FILES || isUploading) && styles.disabledText,
                  ]}
                >
                  <Text style={{ color: '#667085' }}>Or</Text> Open Camera
                </Text>
              </TouchableOpacity>
            </View>

            {renderUploadedFiles()}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>GST Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter GST Number"
                value={gstNumber}
                onChangeText={setGstNumber}
                maxLength={15}
                keyboardType="default"
              />
              {gstNumber.length > 0 && gstNumber.length !== 15 && (
                <Text style={styles.errorText}>GST Number should be 15 characters</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.nextButton,
              (!isFormValid || isLoading || isUploading) && styles.disabledButton,
            ]}
            onPress={handleKycAndCompanyRegister}
            disabled={!isFormValid || isLoading || isUploading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.nextButtonText}>Next</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 50,
  },
  header: {
    width: '100%',
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.05,
  },
  backButton: {
    padding: 8,
  },
  container: {
    width: '90%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: height * 0.02,
  },
  title: {
    fontSize: width * 0.06,
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
    marginBottom: 50,
  },
  inputContainer: {
    width: '100%',
    marginBottom: height * 0.02,
  },
  label: {
    fontSize: width * 0.045,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 8,
  },
  subLabel: {
    fontSize: width * 0.035,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginBottom: 12,
  },
  uploadContainer: {
    width: '100%',
    marginBottom: height * 0.02,
  },
  fileUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#14B6AA',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  fileUploadText: {
    color: '#9F9F9F',
    fontFamily: 'Poppins-SemiBold',
    marginLeft: 8,
  },
  cameraButtonContainer: {
    width: '100%',
    alignItems: 'flex-start',
  },
  cameraUploadButton: {
    alignItems: 'center',
    marginBottom: 12,
  },
  cameraUploadText: {
    color: '#14B6AA',
    fontFamily: 'Poppins-SemiBold',
  },
  textInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ADADAD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 20,
    marginBottom: 8,
  },
  uploadedFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#14B6AA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  uploadedFileName: {
    flex: 1,
    marginHorizontal: 8,
    fontFamily: 'Poppins-Regular',
  },
  uploadStatusIndicator: {
    marginRight: 10,
  },
  nextButton: {
    backgroundColor: '#14B6AA',
    paddingVertical: height * 0.02,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontFamily: 'Poppins-SemiBold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  disabledText: {
    color: '#ccc',
  },
  dropdownStyle: {
    borderColor: '#ADADAD',
    borderRadius: 8,
  },
  dropdownContainerStyle: {
    borderColor: '#ADADAD',
  },
  placeholderStyle: {
    color: '#ADADAD',
  },
  errorText: {
    color: 'red',
    fontSize: width * 0.035,
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
  },
});

export default KycScreen;
