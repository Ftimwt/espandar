import React, { useEffect } from 'react';

interface Props extends React.PropsWithChildren {
  title?: string;
}

const Page = (props: Props) => {
  useEffect(() => {
    let appName = import.meta.env.VITE_APP_NAME;
    const prefix = appName ? appName + ' - ' : '';
    document.title = prefix + (props.title || 'Dashboard');
  }, [props.title]);

  return props.children;
};

export default Page;
