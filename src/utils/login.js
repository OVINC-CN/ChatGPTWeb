import globalContext from '../context';

export const redirectToLogin = () => {
  const localLoginWebUrl = `${globalContext.siteUrl}/login/?next=${encodeURIComponent(window.location.href)}`;
  window.location.href = `${globalContext.ovincWebUrl}/login/?next=${encodeURIComponent(localLoginWebUrl)}`;
};
