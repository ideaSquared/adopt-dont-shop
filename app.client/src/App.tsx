import { AuthProvider } from '@/contexts/AuthContext';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { Footer, Header } from '@adopt-dont-shop/components';
import { Route, Routes } from 'react-router-dom';

// Placeholder components for pages not yet implemented
const SearchPage = () => <div>Search Page - To be migrated</div>;
const PetDetailsPage = () => <div>Pet Details Page - To be migrated</div>;
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
            <Route path='/search' element={<SearchPage />} />
            <Route path='/pets/:id' element={<PetDetailsPage />} />
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

