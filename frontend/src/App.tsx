import { BrowserRouter, Route, Routes } from 'react-router';
import HomePage from './pages/home.tsx';
import LoginAuthPage from './pages/auth/login.tsx';
import SignupAuthPage from './pages/auth/signup.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuthLayout from './layouts/auth.tsx';
import NotificationLayout from './layouts/notifications.tsx';
import ChatLayout from './components/ChatLayout.tsx';
import CallProvider from './components/call';
import ConferenceList from './components/Conference/ConferenceList.tsx';
import ConferenceRoom from './pages/ConferenceRoom.tsx';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* مسیرهای احراز هویت */}
          <Route path="/auth">
            <Route index element={<LoginAuthPage />} />
            <Route path="signup" element={<SignupAuthPage />} />
          </Route>

          {/* مسیر اصلی برنامه با لایه‌بندی */}
          <Route path="/" element={<AuthLayout />}>
            <Route path="/" element={<CallProvider />}>
              <Route path="/" element={<NotificationLayout />}>
                <Route path="/" element={<ChatLayout />}>
                  <Route index element={<div />} />
                  <Route path="chat/:receiverType/:uuid" element={<HomePage />} />
                  <Route path="conference" element={<ConferenceList />} />
                  <Route path="conference/:conferenceID" element={<ConferenceRoom />} />
                </Route>
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
