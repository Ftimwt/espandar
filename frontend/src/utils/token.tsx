export const useToken = (): string => {
  return localStorage.getItem('token') || '';
}

export const useSetToken = (): (token: string) => void => {
  return (token: string) => {
    localStorage.setItem('token', token);
  }
}