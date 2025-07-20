import {Button, Form, Input, notification, Typography} from 'antd';
import {LockOutlined, UserOutlined} from '@ant-design/icons';
import Page from '../page.tsx';
import {useMutation} from '@tanstack/react-query';
import {LoginRequest} from '../../api/auth.ts';
import {useSetToken} from "../../utils/token.tsx";
import {useNavigate} from "react-router";

const {Title, Link} = Typography;

const LoginAuthPage = () => {
  const [api, contextHolder] = notification.useNotification();
  const setToken = useSetToken();
  const navigate = useNavigate();

  const loginReq = useMutation({
    mutationFn: LoginRequest,
    onSuccess: (res) => {
      setToken(res.data.token);
      api.success({message: 'خوش آمدید'});
      navigate('/');
      window.location.reload();
    },
    onError: (error) => {
      api.error({message: error.message});
    },
  });

  const onFinish = (values: LoginRequest) => {
    console.log('Login data:', values);
    loginReq.mutate({
      username: values.username,
      password: values.password,
    });
  };

  return (
    <Page title="Login">
      {contextHolder}
      <div className="flex min-h-screen flex-col justify-center px-6 py-12 bg-gray-50">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center">
          <img
            className="mx-auto h-10 w-auto"
            src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
            alt="Your Company"
          />
          <Title level={3} className="!mt-8 !mb-4 !text-gray-900">
            Sign in to your account
          </Title>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-sm">
          <Form
            name="login"
            onFinish={onFinish}
            layout="vertical"
            requiredMark={false}
            className="space-y-1"
          >
            <Form.Item
              label="Username"
              name="username"
              rules={[{required: true, message: 'Please enter your username!'}]}
            >
              <Input prefix={<UserOutlined/>} placeholder="Username" size="large"/>
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{required: true, message: 'Please enter your password!'}]}
            >
              <Input.Password prefix={<LockOutlined/>} placeholder="Password" size="large"/>
            </Form.Item>
            {/*
            <div className="flex justify-end text-sm">
              <Link href="#" className="text-indigo-600 hover:text-indigo-500">
                Forgot password?
              </Link>
            </div>
            */}
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                className="w-full bg-indigo-600 hover:bg-indigo-500"
              >
                Sign in
              </Button>
            </Form.Item>
          </Form>

          <p className="mt-10 text-center text-sm text-gray-500">
            Not a member?{' '}
            <Link href="/auth/signup" className="text-indigo-600 hover:text-indigo-500">
              Create new account
            </Link>
          </p>
        </div>
      </div>
    </Page>
  );
};

export default LoginAuthPage;
