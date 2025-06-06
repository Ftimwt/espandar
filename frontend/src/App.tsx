import { BrowserRouter, Route, Routes } from 'react-router';
import HomePage from './pages/home.tsx';
import LoginAuthPage from './pages/auth/login.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChatLayout from './components/ChatLayout.tsx';
import AuthLayout from './layouts/auth.tsx';
import NotificationLayout from './layouts/notifications.tsx';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/auth">
            <Route index element={<LoginAuthPage />} />
          </Route>
          <Route path="/" element={<AuthLayout />}>
            <Route path="/" element={<NotificationLayout />}>
              <Route path="/" element={<ChatLayout />}>
                <Route index element={<div></div>} />
                <Route path="/chat/:uuid" element={<HomePage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
