import {BrowserRouter, Route, Routes} from 'react-router';
import HomePage from './pages/home.tsx';
import LoginAuthPage from './pages/auth/login.tsx';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import ChatLayout from "./components/ChatLayout.tsx";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/auth">
            <Route index element={<LoginAuthPage/>}/>
          </Route>
          <Route path="/" element={<ChatLayout/>}>
            <Route index element={<HomePage/>}/>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
