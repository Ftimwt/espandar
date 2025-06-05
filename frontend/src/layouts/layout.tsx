import { Layout } from 'antd';
import { Outlet } from 'react-router';

const BaseLayout = () => {
  // const {} =

  return (
    <Layout>
      {/*<Layout.Header></Layout.Header>*/}
      <Layout.Content>
        <Outlet />
      </Layout.Content>
      {/*<Layout.Footer>*/}

      {/*</Layout.Footer>*/}
    </Layout>
  );
};

export default BaseLayout;
