import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Lock,
  Grid,
  PlayCircle,
  Heart,
  Unlock,
  Flame,
  Clock,
  Download,
  AlertCircle,
  Share2,
  Sparkles,
} from 'lucide-react';
import { ProfileData, Post, Story } from '../types';
import { fetchProfile } from '../services/profileService';

interface ProfileViewProps {
  username: string;
  isUnlocked: boolean;
  onOpenLoginModal: () => void;
  onOpenLightbox: (post: Post) => void;
  onOpenStories: (stories: Story[]) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  username,
  isUnlocked,
  onOpenLoginModal,
  onOpenLightbox,
  onOpenStories,
}) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeTab, setActiveTab] = useState<'posts' | 'stories' | 'liked'>('posts');
  const [fomoViewers, setFomoViewers] = useState(38);
  const [currentTime, setCurrentTime] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const now = new Date();
    setCurrentTime(
      `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}`
    );

    const fomoInterval = setInterval(() => {
      setFomoViewers((prev) => {
        const change = Math.floor(Math.random() * 5) - 2;
        return Math.max(18, Math.min(65, prev + change));
      });
    }, 6000);

    return () => clearInterval(fomoInterval);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setLoadingStep(1);

    const step1 = setTimeout(() => setLoadingStep(2), 700);
    const step2 = setTimeout(() => setLoadingStep(3), 1400);

    const loadProfileData = async () => {
      try {
        const data = await fetchProfile(username);
        setProfile(data);
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setTimeout(() => {
          setIsLoading(false);
        }, 1600);
      }
    };

    loadProfileData();

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
    };
  }, [username]);

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadDp = () => {
    if (!profile) return;
    const link = document.createElement('a');
    link.href = profile.profile_pic;
    link.download = `${profile.username}-dp-fullsize.jpg`;
    link.target = '_blank';
    link.click();
  };

  if (isLoading) {
    return (
      <div className="pt-32 pb-24 px-4 max-w-4xl mx-auto z-10 relative text-center">
        <div className="p-12 rounded-3xl bg-[#121216] border border-[#2c2518] shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col items-center">
          <div className="relative w-20 h-20 mb-8">
            <div className="w-full h-full rounded-full border-4 border-[#eab308]/20 border-t-[#eab308] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-[#fbbf24]">
              <Sparkles className="w-7 h-7" />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-[#faf9f6] mb-6">
            Loading profile information for @{username}...
          </h2>

          <div className="space-y-3 w-full max-w-sm text-left text-sm text-[#a7a294]">
            <div className={`flex items-center gap-3 transition-opacity ${loadingStep >= 1 ? 'opacity-100' : 'opacity-30'}`}>
              <CheckCircle className={`w-4 h-4 ${loadingStep >= 1 ? 'text-[#10b981]' : 'text-[#645f52]'}`} />
              <span>Connecting to server...</span>
            </div>
            <div className={`flex items-center gap-3 transition-opacity ${loadingStep >= 2 ? 'opacity-100' : 'opacity-30'}`}>
              <CheckCircle className={`w-4 h-4 ${loadingStep >= 2 ? 'text-[#10b981]' : 'text-[#645f52]'}`} />
              <span>Fetching profile data...</span>
            </div>
            <div className={`flex items-center gap-3 transition-opacity ${loadingStep >= 3 ? 'opacity-100' : 'opacity-30'}`}>
              <CheckCircle className={`w-4 h-4 ${loadingStep >= 3 ? 'text-[#10b981]' : 'text-[#645f52]'}`} />
              <span>Analyzing content & hidden metadata...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pt-36 pb-24 px-4 max-w-xl mx-auto z-10 relative text-center">
        <div className="p-8 rounded-2xl bg-[#121216] border border-red-500/30">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#faf9f6] mb-2">Profile Not Found</h2>
          <p className="text-sm text-[#a7a294] mb-6">
            Could not fetch profile for "{username}". Please verify the username and try again.
          </p>
        </div>
      </div>
    );
  }

  const isContentLocked = profile.is_private && !isUnlocked;

  return (
    <div className="pt-4 pb-6 px-2 max-w-5xl mx-auto z-10 relative">
      <div className="rounded-3xl bg-[#121216] border border-[#2c2518] overflow-hidden mb-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        <div className="h-44 sm:h-52 relative bg-gradient-to-r from-[#d97706]/20 via-[#f59e0b]/15 to-[#b45309]/10 overflow-hidden">
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                'radial-gradient(circle at 25% 25%, rgba(234, 179, 8, 0.4) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(234, 179, 8, 0.4) 1px, transparent 1px)',
              backgroundSize: '30px 30px',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#121216] to-transparent" />
        </div>

        <div className="px-6 sm:px-10 pb-8 -mt-20 relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 text-center sm:text-left">
          <div className="relative group">
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-[#121216] border-4 border-[#121216] shadow-[0_0_0_3px_rgba(234,179,8,0.5),0_15px_40px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform duration-300">
              <img
                src={profile.profile_pic}
                alt={profile.username}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <button
              onClick={handleDownloadDp}
              title="Download Full Size DP"
              className="absolute -bottom-1 -right-1 p-2 rounded-full bg-[#191920] border border-[#eab308]/60 text-[#faf9f6] hover:text-[#fbbf24] hover:scale-110 transition-all shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 pt-2 sm:pt-14">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#faf9f6]">
                {profile.username}
              </h1>
              {profile.is_verified && (
                <CheckCircle className="w-5 h-5 text-[#fbbf24] fill-[#fbbf24]" />
              )}
              {profile.is_private && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#eab308]/15 text-[#fbbf24] border border-[#eab308]/30">
                  <Lock className="w-3 h-3" />
                  <span>Private Account</span>
                </div>
              )}
              <button
                onClick={handleShare}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#a7a294] hover:text-[#faf9f6] transition-colors cursor-pointer"
                title="Share profile"
              >
                <Share2 className="w-4 h-4" />
              </button>
              {copied && (
                <span className="text-xs text-[#10b981] font-semibold">Link copied!</span>
              )}
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-4 sm:gap-6 my-4">
              <div className="text-center px-4 py-2 rounded-xl bg-[#0c0c0f] border border-[#2c2518] min-w-[85px]">
                <strong className="block text-base sm:text-lg font-bold text-[#faf9f6]">
                  {formatNumber(profile.post_count)}
                </strong>
                <span className="text-[11px] text-[#a7a294] uppercase font-semibold">Posts</span>
              </div>
              <div className="text-center px-4 py-2 rounded-xl bg-[#0c0c0f] border border-[#2c2518] min-w-[85px]">
                <strong className="block text-base sm:text-lg font-bold text-[#faf9f6]">
                  {formatNumber(profile.followers)}
                </strong>
                <span className="text-[11px] text-[#a7a294] uppercase font-semibold">Followers</span>
              </div>
              <div className="text-center px-4 py-2 rounded-xl bg-[#0c0c0f] border border-[#2c2518] min-w-[85px]">
                <strong className="block text-base sm:text-lg font-bold text-[#faf9f6]">
                  {formatNumber(profile.following)}
                </strong>
                <span className="text-[11px] text-[#a7a294] uppercase font-semibold">Following</span>
              </div>
            </div>

            {profile.full_name && (
              <div className="text-sm font-bold text-[#faf9f6] mb-1">{profile.full_name}</div>
            )}
            {profile.biography && (
              <div className="text-xs sm:text-sm text-[#a7a294] whitespace-pre-line leading-relaxed mb-2 max-w-xl">
                {profile.biography}
              </div>
            )}
            {profile.category && (
              <div className="inline-flex items-center gap-1.5 text-xs text-[#fbbf24] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
                <span>{profile.category}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex bg-[#121216] border border-[#2c2518] rounded-2xl p-1.5 mb-5 text-xs sm:text-sm font-semibold">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
            activeTab === 'posts'
              ? 'bg-[#eab308]/15 text-[#faf9f6] border border-[#eab308]/40 shadow-sm'
              : 'text-[#a7a294] hover:text-[#faf9f6]'
          }`}
        >
          <Grid className="w-4 h-4 text-[#fbbf24]" />
          <span>Posts</span>
        </button>

        <button
          onClick={() => {
            if (isContentLocked) {
              onOpenLoginModal();
            } else if (profile.stories && profile.stories.length > 0) {
              onOpenStories(profile.stories);
            } else {
              setActiveTab('stories');
            }
          }}
          className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
            activeTab === 'stories'
              ? 'bg-[#eab308]/15 text-[#faf9f6] border border-[#eab308]/40 shadow-sm'
              : 'text-[#a7a294] hover:text-[#faf9f6]'
          }`}
        >
          <PlayCircle className="w-4 h-4 text-[#fbbf24]" />
          <span>Stories</span>
          {isContentLocked && <Lock className="w-3 h-3 text-[#fbbf24]" />}
        </button>

        <button
          onClick={() => {
            if (isContentLocked) {
              onOpenLoginModal();
            } else {
              setActiveTab('liked');
            }
          }}
          className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
            activeTab === 'liked'
              ? 'bg-[#eab308]/15 text-[#faf9f6] border border-[#eab308]/40 shadow-sm'
              : 'text-[#a7a294] hover:text-[#faf9f6]'
          }`}
        >
          <Heart className="w-4 h-4 text-[#fbbf24]" />
          <span>Liked Posts</span>
          {isContentLocked && <Lock className="w-3 h-3 text-[#fbbf24]" />}
        </button>
      </div>

      <div
        className={`p-5 rounded-2xl border mb-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all shadow-sm ${
          isContentLocked
            ? 'bg-[#121216] border-[#2c2518]'
            : 'bg-[#10b981]/10 border-[#10b981]/30'
        }`}
      >
        <div className="text-center sm:text-left">
          {isContentLocked ? (
            <>
              <strong className="block text-sm sm:text-base font-bold text-[#faf9f6] mb-0.5">
                🔒 Hidden Account · Photos and Stories are locked
              </strong>
              <span className="text-xs sm:text-sm text-[#a7a294]">
                Sign in to view hidden photos, stories and private highlights instantly.
              </span>
            </>
          ) : (
            <>
              <strong className="block text-sm sm:text-base font-bold text-[#10b981] mb-0.5">
                ✅ Premium Member · You have full access to all content
              </strong>
              <span className="text-xs sm:text-sm text-[#faf9f6]/80">
                Private photos and stories are now unlocked in high definition.
              </span>
            </>
          )}
        </div>

        {isContentLocked && (
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-[#050507] bg-gradient-to-r from-[#fef08a] via-[#eab308] to-[#d97706] hover:shadow-[0_0_25px_rgba(234,179,8,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Unlock className="w-4 h-4 text-[#050507]" />
            <span>Sign In & View</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#eab308]/5 border border-[#eab308]/20 text-xs sm:text-sm text-[#a7a294] mb-6">
        <Flame className="w-4 h-4 text-[#fbbf24] flex-shrink-0" />
        <div>
          <span className="w-2 h-2 rounded-full bg-[#10b981] inline-block mr-2 animate-ping" />
          <strong className="text-[#fbbf24]">{fomoViewers} people</strong> viewed private profiles in the last 1 hour
        </div>
        <div className="ml-auto text-[11px] text-[#645f52] hidden sm:flex items-center gap-1">
          <Clock className="w-3 h-3 text-[#fbbf24]" />
          <span>{currentTime}</span>
        </div>
      </div>

      {activeTab === 'posts' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
          {profile.posts && profile.posts.length > 0 ? (
            profile.posts.map((post, index) => (
              <div
                key={index}
                onClick={() => {
                  if (isContentLocked) {
                    onOpenLoginModal();
                  } else {
                    onOpenLightbox(post);
                  }
                }}
                className="group relative aspect-square rounded-xl overflow-hidden bg-[#121216] border border-[#2c2518] cursor-pointer hover:border-[#eab308]/60 hover:scale-[1.02] transition-all"
              >
                <img
                  src={post.thumbnail}
                  alt={`Post by ${profile.username}`}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    isContentLocked ? 'blur-md scale-110 brightness-75' : 'group-hover:opacity-90'
                  }`}
                  loading="lazy"
                />

                {isContentLocked ? (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-2 text-center">
                    <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center mb-2 border border-white/10 text-[#fbbf24] shadow-lg">
                      <Lock className="w-5 h-5 text-[#fbbf24]" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold drop-shadow text-[#faf9f6]">
                      Sign in to view
                    </span>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-[#faf9f6] font-bold text-sm sm:text-base">
                    <div className="flex items-center gap-1.5">
                      <Heart className="w-4 h-4 fill-white" />
                      <span>{formatNumber(post.likes)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <i className="fas fa-comment text-[#fbbf24]" />
                      <span>{formatNumber(post.comments)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-16 text-[#a7a294]">
              No posts available for this account.
            </div>
          )}
        </div>
      )}

      {activeTab === 'stories' && (
        <div className="text-center py-12 p-8 rounded-2xl bg-[#121216] border border-[#2c2518]">
          <PlayCircle className="w-12 h-12 text-[#fbbf24] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#faf9f6] mb-2">
            Instagram Stories for @{profile.username}
          </h3>
          <p className="text-sm text-[#a7a294] max-w-md mx-auto mb-6">
            Watch real-time stories uploaded within the last 24 hours anonymously.
          </p>
          <button
            onClick={() => {
              if (profile.stories && profile.stories.length > 0) {
                onOpenStories(profile.stories);
              }
            }}
            className="px-6 py-3 rounded-xl font-bold text-sm text-[#050507] bg-gradient-to-r from-[#fef08a] via-[#eab308] to-[#d97706] hover:shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all cursor-pointer"
          >
            Watch Stories Anonymously
          </button>
        </div>
      )}

      {activeTab === 'liked' && (
        <div className="text-center py-12 p-8 rounded-2xl bg-[#121216] border border-[#2c2518]">
          <Heart className="w-12 h-12 text-[#fbbf24] mx-auto mb-4 fill-[#fbbf24]/20" />
          <h3 className="text-lg font-bold text-[#faf9f6] mb-2">Recently Liked Posts</h3>
          <p className="text-sm text-[#a7a294] max-w-md mx-auto mb-6">
            Posts and media this account recently interacted with.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
            {profile.posts?.slice(0, 3).map((p, i) => (
              <div
                key={i}
                onClick={() => onOpenLightbox(p)}
                className="aspect-square rounded-xl overflow-hidden cursor-pointer border border-[#2c2518]"
              >
                <img src={p.thumbnail} alt="Liked post" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
