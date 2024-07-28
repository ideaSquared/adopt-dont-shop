import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Users from './pages/Users';
// Uncomment these once you have the components
// import Pets from './pages/Pets';
// import Conversations from './pages/Conversations';
import Header from './components/layout/Header';
// Uncomment this once you have the component
// import Footer from './components/layout/Footer';

const App: React.FC = () => {
	return (
		<Router>
			<Header />
			<Routes>
				<Route path='/' element={<Home />} />
				<Route path='/users' element={<Users />} />
				{/* <Route path='/pets' element={<Pets />} /> */}
			</Routes>
			{/* <Footer /> */}
		</Router>
	);
};

export default App;
