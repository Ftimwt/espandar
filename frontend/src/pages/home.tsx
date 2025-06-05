import Page from './page.tsx';
import ChatWindow from "../components/ChatWindow/ChatWindow.tsx";

const HomePage = () => {
  return (
    <Page title="Home">
      <ChatWindow/>
    </Page>
  );
};

export default HomePage;
