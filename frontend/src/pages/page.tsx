import React, {useEffect} from 'react';
import {useGetUserInfo} from "../api/user.ts";
import {useLocation, useNavigate} from "react-router";

interface Props extends React.PropsWithChildren {
  title?: string;
}

const Page = (props: Props) => {
  const {data, error} = useGetUserInfo();
  const navigate = useNavigate();
  const {pathname} = useLocation();

  useEffect(() => {
    if (error) {
      console.log(error)
      const re = /\/auth\/.*/
      if (re.test(pathname)) return;
      navigate('/auth')
    } else {
      console.log(data);
    }

  }, [error, data]);

  useEffect(() => {
    let appName = import.meta.env.VITE_APP_NAME;
    const prefix = appName ? appName + ' - ' : '';
    document.title = prefix + (props.title || 'Dashboard');
  }, [props.title]);

  return props.children;
};

export default Page;
