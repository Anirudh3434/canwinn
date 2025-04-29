import { configureStore } from '@reduxjs/toolkit';
import personalDetailsReducer from './slice/personalDetail';
import searchHistoryReducer from './slice/SearchHistorySlice';
import sidebarReducer from './slice/sideBarSlice';
import RoleReducer from './slice/RoleSlice';
import CompanyDetailSlice from './slice/CompanyDetail';

const store = configureStore({
  reducer: {
    personalDetails: personalDetailsReducer,
    searchHistory: searchHistoryReducer,
    sidebar: sidebarReducer,
    role: RoleReducer,
    companyDetail: CompanyDetailSlice,
  },
});

export default store;
