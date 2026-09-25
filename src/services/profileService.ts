import { ProfileData } from '../types';

const demoProfile: ProfileData = {
  username: 'securewatch',
  full_name: 'SecureWatch Intelligence',
  biography:
    'Threat analyst • digital surveillance • security research\nMonitoring global attack surfaces and protecting critical infrastructure.',
  category: 'Cybersecurity Research',
  profile_pic: '/securewatch-logo.avif',
  is_verified: true,
  is_private: true,
  followers: 482300,
  following: 214,
  post_count: 128,
  posts: [
    {
      id: 'p1',
      thumbnail: '/securewatch-logo.avif',
      likes: 18420,
      comments: 1240,
    },
    {
      id: 'p2',
      thumbnail: '/securewatch-logo.avif',
      likes: 9630,
      comments: 872,
    },
    {
      id: 'p3',
      thumbnail: '/securewatch-logo.avif',
      likes: 24350,
      comments: 1908,
    },
    {
      id: 'p4',
      thumbnail: '/securewatch-logo.avif',
      likes: 7200,
      comments: 501,
    },
    {
      id: 'p5',
      thumbnail: '/securewatch-logo.avif',
      likes: 13560,
      comments: 1033,
    },
    {
      id: 'p6',
      thumbnail: '/securewatch-logo.avif',
      likes: 22110,
      comments: 1709,
    },
  ],
  stories: [
    { id: 's1', image: '/securewatch-logo.avif', title: 'Threat Brief' },
    { id: 's2', image: '/securewatch-logo.avif', title: 'Botnet Watch' },
    { id: 's3', image: '/securewatch-logo.avif', title: 'IOC Feed' },
  ],
};

export const fetchProfile = async (username: string): Promise<ProfileData> => {
  await new Promise((resolve) => setTimeout(resolve, 700));

  if (!username || username.trim() === '') {
    throw new Error('Username is required');
  }

  return {
    ...demoProfile,
    username,
    full_name: username === 'securewatch' ? demoProfile.full_name : `${username} Security Profile`,
  };
};
