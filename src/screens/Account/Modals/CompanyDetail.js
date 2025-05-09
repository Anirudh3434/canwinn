import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { API_ENDPOINTS } from '../../../api/apiConfig'; // Corrected import path
import DropDownPicker from 'react-native-dropdown-picker';

const CompanyDetails = () => {
  const route = useRoute();
  const { data } = route.params || {};
  const navigation = useNavigation();

  const company = data?.data || {};


  console.log('Company Details:', company);

  const [email, setEmail] = useState(company?.company_email || '');
  const [website, setWebsite] = useState(company?.company_website || '');
  const [founded, setFounded] = useState(company?.founded_year?.toString() || ''); // Ensure string
  const [employee, setEmployee] = useState(company?.no_of_employees?.toString() || ''); // Ensure string
  const [industry, setIndustry] = useState(company?.industry || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [open, setOpen] = useState(false);
  const [industryList, setIndustryList] = useState([
    { label: 'Technology', value: 'Technology' },
    { label: 'Healthcare', value: 'Healthcare' },
    { label: 'Finance', value: 'Finance' },
    { label: 'Education', value: 'Education' },
    { label: 'Manufacturing', value: 'Manufacturing' },
    { label: 'Retail', value: 'Retail' },
    { label: 'Software Development', value: 'Software Development' },
    { label: 'IT Services', value: 'IT Services' },
  ]);

  useEffect(() => {
    // Set initial values, important for edits
    setEmail(company?.company_email || '');
    setWebsite(company?.company_website || '');
    setFounded(company?.founded_year?.toString() || '');
    setEmployee(company?.no_of_employees?.toString() || '');
    setIndustry(company?.industry || '');
  }, [company]);

  

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSave = async () => {
    const payload = {
      company_id: parseInt(company?.company_id ?? 0, 10),
      company_type: company?.company_type ?? '',
      company_logo: company?.company_logo ?? '',
      company_name: company?.company_name ?? '',
      industry: industry ?? '',
      city: company?.city ?? '',
      company_address: company?.company_address ?? '',
      company_email: email ?? '',
      company_website: website ?? '',
      about: company?.about ?? '',
      hr_email: company?.hr_email ?? '',
      company_gstin: company?.company_gstin ?? '',
      verified_status: company?.verified_status ?? 'N',
      no_of_employees: parseInt(employee ?? 0, 10),
      country: parseInt(company?.country ?? 0, 10),
      state: parseInt(company?.state ?? 0, 10),
      pincode: parseInt(company?.pincode ?? 0, 10),
      founded_year: parseInt(founded ?? 0, 10),
    };

    console.log('Payload:', payload);

    try {
      setLoading(true);
      const response = await axios.post(API_ENDPOINTS.COMPANY_DETAILS, payload);
      const res = response?.data;

      if (res?.status === 'success') {
        setLoading(false);
        navigation.navigate('MyTabs');
      } else {
        Alert.alert('Error', res.message || 'Update failed');
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong while saving');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.title}>Company Details</Text>
        </View>
        <TouchableOpacity
          disabled={loading}
          onPress={handleSave}
          style={styles.saveButtonContainer}
        >
          <Text style={styles.saveButtonText}> {loading ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.errorInput : null]}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholderTextColor="#C8C8C8"
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Website</Text>
          <TextInput
            style={[styles.input, errors.website ? styles.errorInput : null]}
            placeholder="Website"
            value={website}
            onChangeText={setWebsite}
            keyboardType=""
            placeholderTextColor="#C8C8C8"
            autoCapitalize="none"
          />
          {errors.website && <Text style={styles.errorText}>{errors.website}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Founded</Text>
          <TextInput
            style={[styles.input, errors.founded ? styles.errorInput : null]}
            placeholder="Enter Founded Year"
            value={founded}
            onChangeText={setFounded}
            keyboardType="numeric"
            placeholderTextColor="#C8C8C8"
          />
          {errors.founded && <Text style={styles.errorText}>{errors.founded}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Employee</Text>
          <TextInput
            style={[styles.input, errors.employee ? styles.errorInput : null]}
            placeholder="Enter Employee Count"
            value={employee}
            onChangeText={setEmployee}
            keyboardType="numeric"
            placeholderTextColor="#C8C8C8"
          />
          {errors.employee && <Text style={styles.errorText}>{errors.employee}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Industry</Text>
          <DropDownPicker
            listMode="SCROLLVIEW"
            scrollViewProps={{ nestedScrollEnabled: true }}
            open={open}
            value={industry}
            items={industryList}
            setOpen={setOpen}
            setValue={setIndustry}
            placeholder="Select Industry"
            style={[styles.dropdown, errors.industry ? styles.dropdownError : null]}
            dropDownContainerStyle={styles.dropdownContainer}
            zIndex={5000}
            zIndexInverse={1000}
            onChangeValue={setIndustry}
          />
          {errors.industry && <Text style={styles.errorText}>{errors.industry}</Text>}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#00000014',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 10,
  },
  saveButtonContainer: {
    borderWidth: 1,
    borderColor: '#14B6AA',
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  saveButtonText: {
    color: '#14B6AA',
    fontSize: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#D5D9DF',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  bottomPadding: {
    height: 50,
  },
  errorInput: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
  dropdown: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#D5D9DF',
    borderRadius: 8,
    paddingVertical: 10, // Reduced vertical padding
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  dropdownError: {
    borderColor: 'red',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D5D9DF',
    borderRadius: 8,
    marginTop: 5,
    zIndex: 5000,
  },
});

export default CompanyDetails;
