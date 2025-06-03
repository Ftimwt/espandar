import { Button, Form, Input, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import Page from '../page.tsx';
import { useMutation } from '@tanstack/react-query';
import { LoginRequest } from '../../api/auth.ts';

const { Title, Link } = Typography;

const LoginAuthPage = () => {
  const loginReq = useMutation({
    mutationFn: LoginRequest,
    onSuccess: (data) => {
      localStorage.setItem('token', data.data.token);
      console.log(data);
    },
    onError: (error) => {
      console.log(error);
    },
  });

  const onFinish = (values: any) => {
    console.log('Login data:', values);
    loginReq.mutate({
      username: values.username,
      password: values.password,
    });
  };

  return (
    <Page title="Login">
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
              rules={[{ required: true, message: 'Please enter your username!' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: 'Please enter your password!' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
            </Form.Item>

            <div className="flex justify-end text-sm">
              <Link href="#" className="text-indigo-600 hover:text-indigo-500">
                Forgot password?
              </Link>
            </div>

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
            <Link href="#" className="text-indigo-600 hover:text-indigo-500">
              Start a 14 day free trial
            </Link>
          </p>
        </div>
      </div>
    </Page>
  );
};

export default LoginAuthPage;
