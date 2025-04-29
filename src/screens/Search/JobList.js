import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  FlatList,
  ScrollView,
  BackHandler
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { Colors } from '../../theme/color';
import style from '../../theme/style';
import JobDetailModal from '../Home/JobDetail';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import JobSuccess from '../../Components/Popups/JobSuccess';

const SkeletonJobCard = () => (
  <View style={styles.card}>
    <SkeletonPlaceholder speed={800} highlightColor="#F2F8FC" flexDirection="column">
      <SkeletonPlaceholder.Item width='100%' height={150} borderRadius={10} flexDirection='row' justifyContent='space-between'>
        <SkeletonPlaceholder.Item width='70%' height={100} borderRadius={10}>
          <SkeletonPlaceholder.Item width='80%' height={40} borderRadius={10} />
          <SkeletonPlaceholder.Item width='25%' height={20} borderRadius={8} marginTop={5}/>
          <SkeletonPlaceholder.Item width='60%' height={20} borderRadius={8} marginTop={10}/>
          <SkeletonPlaceholder.Item width='60%' height={20} borderRadius={8} marginTop={5}/>
          <SkeletonPlaceholder.Item width='60%' height={20} borderRadius={8} marginTop={5}/>
        </SkeletonPlaceholder.Item>
        <SkeletonPlaceholder.Item width='25%' height={100} borderRadius={10}>
          <SkeletonPlaceholder.Item width={70} height={70} borderRadius={50}/>
          <SkeletonPlaceholder.Item width={70} height={20} borderRadius={8} marginTop={10}/>
          <SkeletonPlaceholder.Item width={70} height={20} borderRadius={8} marginTop={10}/>
        </SkeletonPlaceholder.Item>
      </SkeletonPlaceholder.Item>
    </SkeletonPlaceholder>
  </View>
);

function JobList() {
  const navigation = useNavigation();
  const route = useRoute();
  const { title, location } = route.params || {};


  const backAction = () => {

 if (navigation.isFocused()) {
    navigation.navigate('Search'); 
    return true;
  }
  }

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [successPop, setSuccessPop] = useState(false);
  const [filtersData, setFiltersData] = useState({});
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilterTab, setSelectedFilterTab] = useState(0);
  
  // Memoize filtered jobs to avoid unnecessary recalculations
  const filteredJobs = useMemo(() => {
    if (Object.keys(filtersData).length === 0) {
      return jobs;
    }
    
    return applyFilters(jobs, filtersData);
  }, [jobs, filtersData]);

  const fetchSearchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `https://devcrm20.abacasys.com/ords/canwinn/mobile_api/filtering?search_input=${encodeURIComponent(title || '')}&job_location=${encodeURIComponent(location || '')}`
      );
      if (response.data.status === 'success') {
        setJobs(response.data.data);
      } else {
        // Handle error response
        setJobs([]);
      }
    } catch (error) {
      // Handle network error
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, [title, location]);
  
  useEffect(() => {
    fetchSearchJobs();
    
    // Enable hardware back button handling
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (modalVisible) {
        // Prevent default behavior
        e.preventDefault();
        // Close modal instead
        setModalVisible(false);
      }
    });
    
    return unsubscribe;
  }, [navigation, fetchSearchJobs]);

  // This function applies all selected filters to the jobs
  const applyFilters = (jobsToFilter, filters) => {
    let results = [...jobsToFilter];
    
    // Process each filter category
    Object.entries(filters).forEach(([category, selectedOptions]) => {
      if (selectedOptions && selectedOptions.length > 0) {
        switch(category) {
          case 'Work Mode':
            results = results.filter(job => 
              selectedOptions.some(option => 
                job.workplace_type && job.workplace_type.toLowerCase() === option.toLowerCase()
              )
            );
            break;
          
          case 'Experience':
            results = results.filter(job => {
              const minExp = parseInt(job.min_experience) || 0;
              const maxExp = parseInt(job.max_experience) || 0;
              
              return selectedOptions.some(range => {
                if (range === 'Fresher') {
                  return minExp === 0;
                } else if (range === '1-2 years') {
                  return minExp >= 1 && maxExp <= 2;
                } else if (range === '2-5 years') {
                  return minExp >= 2 && maxExp <= 5;
                } else if (range === '5+ years') {
                  return minExp >= 5;
                }
                return false;
              });
            });
            break;
          
          case 'Salary':
            results = results.filter(job => {
              const minSalary = parseFloat(job.min_salary) || 0;
              const maxSalary = parseFloat(job.max_salary) || 0;
              
              return selectedOptions.some(range => {
                if (range === '0-3 LPA') {
                  return minSalary >= 0 && maxSalary <= 3;
                } else if (range === '3-6 LPA') {
                  return (minSalary >= 3 && minSalary <= 6) || (maxSalary >= 3 && maxSalary <= 6);
                } else if (range === '6-10 LPA') {
                  return (minSalary >= 6 && minSalary <= 10) || (maxSalary >= 6 && maxSalary <= 10);
                } else if (range === '10+ LPA') {
                  return minSalary >= 10 || maxSalary >= 10;
                }
                return false;
              });
            });
            break;
          
          case 'Industries':
            results = results.filter(job => 
              selectedOptions.some(industry => 
                job.industry && job.industry.toString() === industry
              )
            );
            break;
          
          case 'Work Type':
            results = results.filter(job => 
              selectedOptions.some(type => 
                job.employment_type && job.employment_type.toLowerCase() === type.toLowerCase()
              )
            );
            break;
          
          case 'Department':
            results = results.filter(job => 
              selectedOptions.some(department => 
                job.department && job.department.includes(department)
              )
            );
            break;
          
          case 'Company Size':
            // No company size in the data, could be added later
            break;
          
          case 'Role':
            results = results.filter(job => 
              selectedOptions.some(role => 
                job.job_title && job.job_title.toLowerCase().includes(role.toLowerCase())
              )
            );
            break;
          
          case 'Stipend':
            results = results.filter(job => {
              const minSalary = parseFloat(job.min_salary) || 0;
              
              return selectedOptions.some(range => {
                if (range === 'Unpaid') {
                  return minSalary === 0;
                } else if (range === '0-5K per month') {
                  return minSalary > 0 && minSalary <= 0.6; // Converting to annual (0.6 LPA = 5K/month)
                } else if (range === '5K-10K per month') {
                  return minSalary > 0.6 && minSalary <= 1.2; // (1.2 LPA = 10K/month)
                } else if (range === '10K+ per month') {
                  return minSalary > 1.2;
                }
                return false;
              });
            });
            break;
          
          case 'Education':
            results = results.filter(job => 
              selectedOptions.some(education => 
                job.education && job.education.split(',').some(level => 
                  level.trim().toLowerCase() === education.toLowerCase()
                )
              )
            );
            break;
          
          case 'Posted By':
            results = results.filter(job => 
              selectedOptions.some(poster => 
                job.company_type && job.company_type.toLowerCase().includes(poster.toLowerCase())
              )
            );
            break;
        }
      }
    });
    
    return results;
  };

  const handleSuccess = useCallback(() => {
    setSuccessPop(true);
    setModalVisible(false);
  }, []);

  const openJobDetail = useCallback((job) => {
    setSelectedJob(job);
    setModalVisible(true);
  }, []);

  const closeJobDetail = useCallback(() => {
    setModalVisible(false);
  }, []);

  const openFilterScreen = useCallback((tabIndex) => {
    setSelectedFilterTab(tabIndex);
    // Use proper navigation instead of conditional rendering
    navigation.navigate('FilterScreen', {
      initialFilters: filtersData,
      onApplyFilters: handleFilterData,
      selectedTab: tabIndex
    });
  }, [navigation, filtersData]);

  const handleFilterData = useCallback((data) => {
    setFiltersData(data);
  }, []);

  const renderJobCard = useCallback(({ item }) => (
    <View style={styles.card}>
      <View style={styles.jobDetails}>
        <TouchableOpacity
          onPress={() => openJobDetail(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle}>{item.job_title}</Text>
          <Text style={styles.cardText}>{item.company_name}</Text>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="gray" />
            <Text style={styles.detailText}>{item.job_location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="briefcase-outline" size={16} color="gray" />
            <Text style={styles.detailText}>
              {item.min_experience}{item.max_experience ? `-${item.max_experience}` : ''} years
            </Text>
          </View>
        </TouchableOpacity>
        <View style={[styles.detailRow, { marginTop: 10 }]}>
          <ScrollView style={styles.skillContainer} horizontal showsHorizontalScrollIndicator={false}>
            {item.job_skills && item.job_skills.split(',').map((skill, index) => (
              <View key={index} style={styles.skillChip}>
                <Ionicons name="checkmark" size={10} color="gray" />
                <Text style={styles.skillText}>{skill.trim()}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
      <View style={styles.ratingContainer}>
        <Image
          source={require('../../../assets/image/a1.png')}
          style={styles.jobImage}
          resizeMode="contain"
        />
        <View style={styles.ratingInfo}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={18} color="#FFC107" />
            <Text style={styles.rating}>{item.rating || '3.5'}</Text>
          </View>
          <Text style={styles.reviews}>({item.reviews || '5'} reviews)</Text>
        </View>
      </View>
    </View>
  ), [openJobDetail]);

  const renderFilterBadge = useCallback((label, tabIndex) => {
    // Check if this filter category exists in the filtersData
    const isActive = Object.keys(filtersData).includes(label);
    const count = isActive ? filtersData[label].length : 0;
    
    return (
      <TouchableOpacity
        onPress={() => openFilterScreen(tabIndex)}
        style={[
          styles.badgeOptions,
          { backgroundColor: isActive ? '#DFFAF6' : 'transparent' }
        ]}
      >
        <Text style={styles.filterText}>
          {label}{count > 0 ? ` (${count})` : ''}
        </Text>
      </TouchableOpacity>
    );
  }, [filtersData, openFilterScreen]);

  const filterOptions = [
    { label: 'Work Mode', index: 0 },
    { label: 'Experience', index: 1 },
    { label: 'Salary', index: 2 },
    { label: 'Industries', index: 3 },
    { label: 'Work Type', index: 4 },
    { label: 'Department', index: 5 },
    { label: 'Company Size', index: 6 },
    { label: 'Role', index: 7 },
    { label: 'Stipend', index: 8 },
    { label: 'Education', index: 9 },
    { label: 'Posted By', index: 10 },
  ];

  const renderEmptyList = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={50} color="#757575" />
      <Text style={styles.noJobsText}>No Jobs Found</Text>
      {Object.keys(filtersData).length > 0 && (
        <TouchableOpacity 
          style={styles.clearFiltersButton}
          onPress={() => setFiltersData({})}
        >
          <Text style={styles.clearFiltersText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [filtersData]);

  return (
    <SafeAreaView style={[style.area, { backgroundColor: Colors.bg, flex: 1 }]}>
      <StatusBar
        barStyle={modalVisible ? 'light-content' : 'dark-content'}
        backgroundColor={modalVisible ? 'rgba(0, 0, 0, 0.5)' : 'white'}
      />
      
      {successPop && (
        <JobSuccess setSuccessPop={setSuccessPop} />
      )}
      
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Search')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.resultsText}>Results</Text>
          <Text style={styles.jobsFoundText}>
            {isLoading ? 'Searching jobs...' : 
             `${filteredJobs.length} Jobs Found${Object.keys(filtersData).length > 0 ? ' (Filtered)' : ''}`}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <FlatList
          data={Array(4).fill({})}
          renderItem={() => <SkeletonJobCard />}
          keyExtractor={(_, index) => `skeleton-${index}`}
        />
      ) : (
        <FlatList
          data={filteredJobs}
          renderItem={renderJobCard}
          keyExtractor={(item) => `job-${item.id || item.job_id || Math.random().toString()}`}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyList}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      )}

      <View style={styles.filterContainer}>
        <TouchableOpacity
          onPress={() => openFilterScreen(0)}
          style={styles.filterIconContainer}
        >
          <Image
            style={{ width: 40, height: '100%', objectFit: 'contain' }}
            source={require('../../../assets/image/filterIcon.png')}
          />
          {Object.keys(filtersData).length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{Object.keys(filtersData).length}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <FlatList
          horizontal
          data={filterOptions}
          renderItem={({ item }) => renderFilterBadge(item.label, item.index)}
          keyExtractor={(item) => `filter-${item.label}`}
          showsHorizontalScrollIndicator={false}
          style={styles.scrollBadgeFilter}
        />
      </View>
      
      <JobDetailModal
        visible={modalVisible}
        onClose={closeJobDetail}
        job={selectedJob}
        onSuccess={handleSuccess}
      />
    </SafeAreaView>
  );
}

export default JobList;

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerText: {
    marginLeft: 15,
  },
  resultsText: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Poppins-SemiBold',
  },
  jobsFoundText: {
    fontSize: 12,
    color: 'gray',
    fontFamily: 'Poppins-Regular',
  },
  listContainer: {
    paddingBottom: 60, // Extra padding to account for filter bar
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 5,
    backgroundColor: '#DFFAF6',
  },
  skillText: {
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    color: '#505050',
  },
  card: {
    flexDirection: 'row',
    borderRadius: 5,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 20,
    backgroundColor: '#FDFDFD',
    borderColor: '#E9E9E9',
    borderWidth: 1,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    marginBottom: 8,
    color: '#424242',
  },
  ratingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillContainer: {
    gap: 5,
  },
  rating: {
    marginTop: 8,
    fontSize: 13,
    color: '#6C6C6C',
    fontFamily: 'Poppins-Regular',
  },
  reviews: {
    fontSize: 11,
    color: '#6C6C6C',
    fontFamily: 'Poppins-Regular',
  },
  jobImage: {
    width: 35,
    height: 35,
  },
  jobDetails: {
    flex: 1,
    marginRight: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#6C6C6C',
  },
  ratingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
  },
  ratingInfo: {
    alignItems: 'center',
  },
  filterContainer: {
    width: '100%',
    position: 'absolute',
    bottom: 2,
    height: 40,
    borderTopWidth: 1,
    borderColor: '#EFEFEFFF',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'white',
    zIndex: 9999,
  },
  filterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
  },
  filterIconContainer: {
    width: 30,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBadgeFilter: {
    width: '80%',
    height: '100%',
  },
  badgeOptions: {
    borderColor: '#DFDFDF',
    alignSelf: 'flex-start',
    height: '100%',
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginLeft: 10,
  },
  filterText: {
    color: '#667085',
    fontSize: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  noJobsText: {
    fontSize: 16,
    color: '#757575',
    fontFamily: 'Poppins-Medium',
    marginTop: 15,
  },
  clearFiltersButton: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: Colors.primary,
    borderRadius: 5,
  },
  clearFiltersText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
});