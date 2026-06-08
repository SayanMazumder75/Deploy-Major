import React, { useState, useEffect } from "react";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import Spinner from "../../components/common/Spinner";
import authService from "../../services/authService";
import toast from "react-hot-toast";
import {
  User, Mail, Lock, Eye, EyeOff, Settings, X,
  FileText, Brain, Trophy, Flame, MessageCircle,
  TrendingUp, Upload, Sparkles
} from "lucide-react";

const AVATARS = [
  {
    name: "Cat Girl",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#fce7f3"/><ellipse cx="50" cy="58" rx="22" ry="20" fill="#fda4af"/><ellipse cx="50" cy="55" rx="20" ry="18" fill="#fff1f2"/><circle cx="42" cy="52" r="4" fill="#1e1b4b"/><circle cx="58" cy="52" r="4" fill="#1e1b4b"/><circle cx="43" cy="51" r="1.5" fill="white"/><circle cx="59" cy="51" r="1.5" fill="white"/><ellipse cx="50" cy="58" rx="3" ry="2" fill="#fb7185"/><path d="M47 60 Q50 63 53 60" stroke="#fb7185" stroke-width="1.5" fill="none" stroke-linecap="round"/><line x1="38" y1="55" x2="28" y2="52" stroke="#fda4af" stroke-width="1.2"/><line x1="38" y1="57" x2="27" y2="57" stroke="#fda4af" stroke-width="1.2"/><line x1="62" y1="55" x2="72" y2="52" stroke="#fda4af" stroke-width="1.2"/><line x1="62" y1="57" x2="73" y2="57" stroke="#fda4af" stroke-width="1.2"/><path d="M30 25 Q35 10 42 22" fill="#fda4af"/><path d="M70 25 Q65 10 58 22" fill="#fda4af"/><ellipse cx="33" cy="22" rx="5" ry="7" fill="#fce7f3"/><ellipse cx="67" cy="22" rx="5" ry="7" fill="#fce7f3"/></svg>`
  },
  {
    name: "Cool Boy",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#ede9fe"/><ellipse cx="50" cy="58" rx="22" ry="20" fill="#a78bfa"/><ellipse cx="50" cy="55" rx="20" ry="18" fill="#f5f3ff"/><rect x="38" y="50" width="10" height="5" rx="2" fill="#1e1b4b"/><rect x="52" y="50" width="10" height="5" rx="2" fill="#1e1b4b"/><ellipse cx="50" cy="59" rx="3" ry="2" fill="#c084fc"/><path d="M47 61 Q50 64 53 61" stroke="#c084fc" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M28 35 Q50 20 72 35 Q70 55 50 58 Q30 55 28 35z" fill="#7c3aed"/><path d="M28 35 Q50 28 72 35" stroke="#5b21b6" stroke-width="2" fill="none"/></svg>`
  },
  {
    name: "Bunny",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#f0fdf4"/><ellipse cx="50" cy="58" rx="22" ry="20" fill="#bbf7d0"/><ellipse cx="50" cy="55" rx="20" ry="18" fill="#f0fdf4"/><circle cx="42" cy="52" r="4" fill="#14532d"/><circle cx="58" cy="52" r="4" fill="#14532d"/><circle cx="43" cy="51" r="1.5" fill="white"/><circle cx="59" cy="51" r="1.5" fill="white"/><ellipse cx="50" cy="58" rx="3" ry="2" fill="#4ade80"/><path d="M47 60 Q50 63 53 60" stroke="#4ade80" stroke-width="1.5" fill="none" stroke-linecap="round"/><ellipse cx="37" cy="15" rx="6" ry="16" fill="#bbf7d0" stroke="#86efac" stroke-width="1"/><ellipse cx="63" cy="15" rx="6" ry="16" fill="#bbf7d0" stroke="#86efac" stroke-width="1"/><ellipse cx="37" cy="15" rx="3" ry="12" fill="#fda4af"/><ellipse cx="63" cy="15" rx="3" ry="12" fill="#fda4af"/></svg>`
  },
  {
    name: "Princess",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#fdf2f8"/><ellipse cx="50" cy="58" rx="22" ry="20" fill="#f9a8d4"/><ellipse cx="50" cy="55" rx="20" ry="18" fill="#fdf2f8"/><circle cx="42" cy="52" r="4" fill="#831843"/><circle cx="58" cy="52" r="4" fill="#831843"/><circle cx="43" cy="51" r="1.5" fill="white"/><circle cx="59" cy="51" r="1.5" fill="white"/><ellipse cx="50" cy="58" rx="3" ry="2" fill="#ec4899"/><path d="M47 60 Q50 63 53 60" stroke="#ec4899" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M35 30 L50 20 L65 30 L60 38 L50 35 L40 38z" fill="#fbbf24"/><path d="M30 40 Q50 30 70 40 Q68 55 50 58 Q32 55 30 40z" fill="#f472b6"/></svg>`
  },
  {
    name: "Panda",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#f8fafc"/><ellipse cx="50" cy="58" rx="22" ry="20" fill="#e2e8f0"/><ellipse cx="50" cy="55" rx="20" ry="18" fill="#f8fafc"/><ellipse cx="38" cy="48" rx="7" ry="7" fill="#1e293b"/><ellipse cx="62" cy="48" rx="7" ry="7" fill="#1e293b"/><circle cx="38" cy="48" r="4" fill="#f8fafc"/><circle cx="62" cy="48" r="4" fill="#f8fafc"/><circle cx="38" cy="48" r="2.5" fill="#0f172a"/><circle cx="62" cy="48" r="2.5" fill="#0f172a"/><circle cx="38.8" cy="47.2" r="1" fill="white"/><circle cx="62.8" cy="47.2" r="1" fill="white"/><ellipse cx="50" cy="58" rx="4" ry="3" fill="#94a3b8"/><path d="M47 61 Q50 64 53 61" stroke="#94a3b8" stroke-width="1.5" fill="none" stroke-linecap="round"/><ellipse cx="35" cy="28" rx="8" ry="8" fill="#1e293b"/><ellipse cx="65" cy="28" rx="8" ry="8" fill="#1e293b"/></svg>`
  },
  {
    name: "Astronaut",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#eef2ff"/><ellipse cx="50" cy="58" rx="26" ry="24" fill="#c7d2fe"/><rect x="33" y="42" width="34" height="24" rx="12" fill="#c7d2fe" stroke="#a5b4fc" stroke-width="1.5"/><rect x="37" y="46" width="26" height="16" rx="8" fill="#e0e7ff"/><circle cx="42" cy="54" r="4" fill="#4338ca"/><circle cx="58" cy="54" r="4" fill="#4338ca"/><circle cx="43" cy="53" r="1.5" fill="white"/><circle cx="59" cy="53" r="1.5" fill="white"/><rect x="44" y="58" width="12" height="3" rx="1.5" fill="#a5b4fc"/><circle cx="50" cy="38" r="5" fill="#c7d2fe" stroke="#a5b4fc" stroke-width="1"/></svg>`
  },
  {
    name: "Robot",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#e0f2fe"/><rect x="28" y="35" width="44" height="38" rx="6" fill="#7dd3fc"/><rect x="33" y="42" width="13" height="10" rx="3" fill="#0ea5e9"/><rect x="54" y="42" width="13" height="10" rx="3" fill="#0ea5e9"/><circle cx="39" cy="47" r="3" fill="white"/><circle cx="60" cy="47" r="3" fill="white"/><rect x="36" y="58" width="28" height="6" rx="3" fill="#38bdf8"/><rect x="46" y="25" width="8" height="12" rx="3" fill="#7dd3fc"/><circle cx="50" cy="24" r="4" fill="#38bdf8"/></svg>`
  },
];

const RECENT_ACTIVITIES = [
  { icon: Upload, label: "Uploaded Networking Notes", time: "2 hours ago", color: "text-fuchsia-600", bg: "bg-fuchsia-50" },
  { icon: Brain, label: "Generated Flashcards", time: "5 hours ago", color: "text-purple-600", bg: "bg-purple-50" },
  { icon: Sparkles, label: "Used AI Summary", time: "Yesterday", color: "text-pink-600", bg: "bg-pink-50" },
  { icon: Trophy, label: "Completed a Quiz", time: "2 days ago", color: "text-fuchsia-600", bg: "bg-fuchsia-50" },
];

const ProfilePage = () => {
  const [loading, setLoading] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [customAvatar, setCustomAvatar] = useState(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  const stats = [
    { icon: FileText, label: "Documents", value: 12, color: "text-fuchsia-600", bg: "bg-fuchsia-50", border: "border-fuchsia-200" },
    { icon: Brain, label: "Flashcards", value: 48, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
    { icon: Trophy, label: "Quizzes Done", value: 7, color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-200" },
    { icon: Flame, label: "Day Streak", value: 12, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200" },
    { icon: MessageCircle, label: "AI Chats", value: 34, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
  ];

  const progressItems = [
    { label: "Documents Uploaded", value: 12, max: 20, color: "from-fuchsia-400 to-purple-500" },
    { label: "Flashcards Studied", value: 36, max: 48, color: "from-purple-400 to-pink-500" },
    { label: "Quizzes Completed", value: 7, max: 10, color: "from-pink-400 to-fuchsia-500" },
    { label: "AI Features Used", value: 34, max: 50, color: "from-violet-400 to-purple-500" },
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await authService.getProfile();
        setUsername(data.username);
        setEmail(data.email);
        setNewEmail(data.email);
      } catch (error) {
        toast.error("Failed to fetch profile data.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomAvatar(reader.result);
      setSelectedAvatar(null);
      setShowAvatarPicker(false);
      toast.success("Profile photo updated!");
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }
    setPasswordLoading(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowPasswordModal(false);
    } catch (error) {
      toast.error(error.message || "Failed to change password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Profile Settings" />

      <div className="space-y-6">

        {/* User Information Card */}
        <div className="bg-white/80 backdrop-blur-xl border-2 border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/50">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-slate-900">User Information</h3>
            <div className="relative">
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="p-2 rounded-xl hover:bg-slate-100 transition"
              >
                <Settings className="w-5 h-5 text-slate-600" />
              </button>
              {showSettingsMenu && (
                <div className="absolute right-0 top-12 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-50">
                  <button
                    onClick={() => { setShowAvatarPicker(true); setShowSettingsMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-fuchsia-50 transition text-sm rounded-t-xl"
                  >
                    🎨 Change Avatar
                  </button>
                  <button
                    onClick={() => { setShowEmailModal(true); setShowSettingsMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-fuchsia-50 transition text-sm"
                  >
                    📧 Change Email
                  </button>
                  <button
                    onClick={() => { setShowPasswordModal(true); setShowSettingsMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-fuchsia-50 transition text-sm rounded-b-xl"
                  >
                    🔒 Change Password
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Avatar + Name */}
          <div className="flex items-center gap-6 mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-fuchsia-200">
                {customAvatar ? (
                  <img
                    src={customAvatar}
                    alt="profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: AVATARS[selectedAvatar]?.svg }}
                  />
                )}
              </div>
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">{username}</p>
              <p className="text-sm text-slate-500">{email}</p>
            </div>
          </div>

          {/* Avatar Picker — only opens from settings */}
          {showAvatarPicker && (
            <div className="mb-6 p-4 bg-fuchsia-50 border border-fuchsia-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-fuchsia-700 uppercase tracking-wide">
                  Choose your avatar
                </p>
                <button
                  onClick={() => setShowAvatarPicker(false)}
                  className="p-1 hover:bg-fuchsia-100 rounded-lg transition"
                >
                  <X className="w-4 h-4 text-fuchsia-500" />
                </button>
              </div>

              {/* Upload from device */}
              <label className="flex items-center gap-3 p-3 mb-4 bg-white border-2 border-dashed border-fuchsia-300 rounded-xl cursor-pointer hover:border-fuchsia-500 hover:bg-fuchsia-50 transition-all duration-200">
                <div className="w-10 h-10 rounded-xl bg-fuchsia-100 flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5 text-fuchsia-500" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-fuchsia-700">Upload from device</p>
                  <p className="text-xs text-slate-400">JPG, PNG up to 5MB</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>

              {/* Cartoon avatars */}
              <p className="text-xs text-slate-400 mb-3">Or choose a cartoon avatar</p>
              <div className="grid grid-cols-7 gap-3">
                {AVATARS.map((avatar, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      setSelectedAvatar(index);
                      setCustomAvatar(null);
                      setShowAvatarPicker(false);
                    }}
                    className={`cursor-pointer flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all duration-200 ${
                      selectedAvatar === index && !customAvatar
                        ? 'border-fuchsia-500 bg-white'
                        : 'border-transparent hover:border-fuchsia-300 hover:bg-white'
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: avatar.svg }}
                    />
                    <span className="text-xs text-slate-500 text-center leading-tight">
                      {avatar.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Username & Email */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <p className="w-full h-11 pl-9 pr-3 pt-3 border-2 border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-900">
                  {username}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <p className="w-full h-11 pl-9 pr-3 pt-3 border-2 border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-900">
                  {email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className={`bg-white/80 border-2 ${stat.border} rounded-2xl p-4 text-center shadow-sm`}>
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${stat.bg} mb-2`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} strokeWidth={2} />
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Study Progress */}
        <div className="bg-white/80 backdrop-blur-xl border-2 border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/50">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-fuchsia-500" strokeWidth={2} />
            <h3 className="text-lg font-semibold text-slate-900">Study Progress</h3>
          </div>
          <div className="space-y-4">
            {progressItems.map((item, i) => {
              const percent = Math.round((item.value / item.max) * 100);
              return (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    <span className="text-sm font-semibold text-fuchsia-600">{item.value}/{item.max}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-700`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{percent}% completed</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/80 backdrop-blur-xl border-2 border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/50">
          <div className="flex items-center gap-2 mb-5">
            <Flame className="w-5 h-5 text-fuchsia-500" strokeWidth={2} />
            <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            {RECENT_ACTIVITIES.map((activity, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-fuchsia-100 bg-fuchsia-50/50">
                <div className={`w-9 h-9 rounded-xl ${activity.bg} flex items-center justify-center shrink-0`}>
                  <activity.icon className={`w-4 h-4 ${activity.color}`} strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{activity.label}</p>
                  <p className="text-xs text-slate-400">{activity.time}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-fuchsia-400" />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative shadow-xl">
            <button
              onClick={() => setShowEmailModal(false)}
              className="absolute right-4 top-4 p-1 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold mb-4">Change Email</h2>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter new email"
              className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-fuchsia-400 mb-4"
            />
            <Button
              className="w-full"
              onClick={() => {
                setEmail(newEmail);
                setShowEmailModal(false);
                toast.success("Email updated!");
              }}
            >
              Update Email
            </Button>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative shadow-xl">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="absolute right-4 top-4 p-1 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  placeholder="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-3 pr-10 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-fuchsia-400"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-fuchsia-500"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 pr-10 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-fuchsia-400"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-fuchsia-500"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full p-3 pr-10 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-fuchsia-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-fuchsia-500"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button type="submit" disabled={passwordLoading} className="w-full">
                {passwordLoading ? "Changing..." : "Update Password"}
              </Button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;