import { Footer, Header } from '@adopt-dont-shop/components';
import { Route, Routes } from 'react-router-dom';

// Page imports will be added during migration
const HomePage = () => <div>Home Page - To be migrated</div>;
const SearchPage = () => <div>Search Page - To be migrated</div>;
const PetDetailsPage = () => <div>Pet Details Page - To be migrated</div>;
const ApplicationPage = () => <div>Application Page - To be migrated</div>;
const ProfilePage = () => <div>Profile Page - To be migrated</div>;
const LoginPage = () => <div>Login Page - To be migrated</div>;
const RegisterPage = () => <div>Register Page - To be migrated</div>;

function App() {
  return (
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
  );
}

export default App;
