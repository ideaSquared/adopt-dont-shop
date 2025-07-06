import { AuthProvider } from '@/contexts/AuthContext';
import {
  HomePage,
  LoginPage,
  PetDetailsPage,
  RegisterPage,
  RescueDetailsPage,
  SearchPage,
} from '@/pages';
import { Footer, Header } from '@adopt-dont-shop/components';
import { Route, Routes } from 'react-router-dom';
import { DiscoveryPage } from './components/discovery/DiscoveryPage';
const ApplicationPage = () => <div>Application Page - To be migrated</div>;
const ProfilePage = () => <div>Profile Page - To be migrated</div>;

function App() {
  return (
    <AuthProvider>
      <div className='app'>
        <Header />
        <main>
          <Routes>
            <Route path='/' element={<HomePage />} />
            <Route path='/discover' element={<DiscoveryPage />} />
            <Route path='/search' element={<SearchPage />} />
            <Route path='/pets/:id' element={<PetDetailsPage />} />
            <Route path='/rescues/:id' element={<RescueDetailsPage />} />
            <Route path='/apply/:petId' element={<ApplicationPage />} />
            <Route path='/profile' element={<ProfilePage />} />
            <Route path='/login' element={<LoginPage />} />
            <Route path='/register' element={<RegisterPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
