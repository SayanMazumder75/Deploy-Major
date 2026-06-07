import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  ChevronRight,
  FileText,
  Globe,
  GraduationCap,
  LayoutDashboard,
  MessageSquareText,
  Mic,
  Sparkles,
  SquarePen,
  Video,
  BookOpen,
  CalendarRange,
  Database,
  WandSparkles,
} from 'lucide-react';
import FeatureCard from '../../components/landing/FeatureCard';
import workflowVideo from '../../assets/Workflow.mp4';
import './LandingPage.css';

const featureCards = [
  {
    icon: FileText,
    title: 'Smart Documents',
    description: 'Upload notes, PDFs, and study materials to generate instant summaries, insights, and learning-ready breakdowns.',
    accent: '#c084fc',
  },
  {
    icon: GraduationCap,
    title: 'Flashcards & Quizzes',
    description: 'Turn content into revision tools with spaced flashcards and AI-generated quizzes that keep practice focused.',
    accent: '#f472b6',
  },
  {
    icon: Database,
    title: 'Study Vault',
    description: 'Store your learning assets in one secure hub with organized access to summaries, notes, and practice material.',
    accent: '#8b5cf6',
  },
  {
    icon: Mic,
    title: 'AI Meeting Assistant',
    description: 'Capture live meeting transcription, translation, and action-ready notes without leaving the platform.',
    accent: '#fb7185',
  },
  {
    icon: WandSparkles,
    title: 'AI Learning Resources',
    description: 'Generate tailored resources and guidance that help you study faster and prepare with confidence.',
    accent: '#60a5fa',
  },
];

const workflowSteps = [
  'Login',
  'Upload Documents',
  'Generate AI Content',
  'Study Flashcards',
  'Access Study Vault',
  'Use AI Meeting Assistant',
];

const whyChooseItems = [
  {
    icon: Sparkles,
    title: 'AI-powered learning',
    description: 'Automatically turn raw study material and meeting context into structured learning outputs.',
  },
  {
    icon: SquarePen,
    title: 'Time saving',
    description: 'Reduce manual note-taking, summarizing, and revision prep so you can focus on understanding.',
  },
  {
    icon: BadgeCheck,
    title: 'Better revision',
    description: 'Use guided flashcards and quizzes to reinforce retention and improve recall before exams.',
  },
  {
    icon: Globe,
    title: 'Live meeting transcription and translation',
    description: 'Keep meetings accessible with real-time language support and accurate captured notes.',
  },
  {
    icon: LayoutDashboard,
    title: 'Centralized learning platform',
    description: 'Manage documents, quizzes, study vault content, and meetings from one polished workspace.',
  },
];

const quickLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Video', href: '#video' },
  { label: 'Why MEETMIND', href: '#why-meetmind' },
  { label: 'Login', href: '/login' },
];

const LandingPage = () => {
  return (
    <div className="landing-page">
      <div className="landing-page__glow landing-page__glow--one" />
      <div className="landing-page__glow landing-page__glow--two" />
      <div className="landing-page__glow landing-page__glow--three" />

      <header className="landing-nav">
        <Link to="/" className="brand">
          <span className="brand__mark" aria-hidden="true">
            <BrainCircuit />
          </span>
          <span className="brand__copy">
            <span className="brand__title">MEETMIND AI Learning</span>
            <span className="brand__subtitle">Learn Smarter with AI-Powered Study and Meeting Tools</span>
          </span>
        </Link>

        <Link to="/login" className="nav-login-btn">
          Login
          <ArrowRight className="nav-login-btn__icon" />
        </Link>
      </header>

      <main>
        <section className="hero section-shell">
          <div className="hero__copy reveal-up">
            <span className="eyebrow">
              <Sparkles className="eyebrow__icon" />
              AI study platform for documents, quizzes, and meetings
            </span>
            <h1>MEETMIND brings your learning workflow into one premium AI workspace.</h1>
            <p className="hero__description">
              Upload documents, generate AI-generated summaries, build flashcards, run quizzes, and keep every
              meeting organized with AI Meeting Assistant support. MEETMIND gives students and teams a faster way
              to study, revise, and stay aligned.
            </p>

            <div className="hero__actions">
              <Link to="/register" className="cta-btn cta-btn--primary">
                Get Started
                <ArrowRight className="cta-btn__icon" />
              </Link>
              <Link to="/login" className="cta-btn cta-btn--secondary">
                Login
              </Link>
            </div>

            <div className="hero__stats" aria-label="Platform highlights">
              <div className="hero__stat">
                <FileText />
                <span>AI-generated summaries</span>
              </div>
              <div className="hero__stat">
                <BookOpen />
                <span>Flashcards</span>
              </div>
              <div className="hero__stat">
                <CalendarRange />
                <span>Quizzes</span>
              </div>
              <div className="hero__stat">
                <MessageSquareText />
                <span>Study Vault</span>
              </div>
            </div>
          </div>

          <aside className="hero__panel reveal-up" aria-label="Platform preview">
            <div className="glass-card glass-card--hero">
              <div className="glass-card__header">
                <span className="live-pill">
                  <span className="live-pill__dot" />
                  Workflow preview
                </span>
                <div className="glass-card__icon">
                  <Video />
                </div>
              </div>

              <h2>Everything you need for smarter study and meetings.</h2>
              <p>
                MEETMIND combines AI learning resources, revision tools, and live meeting support inside a calm,
                glassmorphism interface designed for focused work.
              </p>

              <div className="glass-card__grid">
                <div>
                  <strong>Smart Documents</strong>
                  <span>Summaries and insights</span>
                </div>
                <div>
                  <strong>Flashcards</strong>
                  <span>Revision on demand</span>
                </div>
                <div>
                  <strong>Study Vault</strong>
                  <span>Centralized learning</span>
                </div>
                <div>
                  <strong>Meeting Assistant</strong>
                  <span>Live transcription</span>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section id="video" className="section-shell section-block reveal-up">
          <div className="section-heading">
            <span className="section-heading__eyebrow">Workflow demo</span>
            <h2>See the MEETMIND workflow in motion.</h2>
            <p>
              The embedded demonstration video shows the end-to-end experience from uploading documents to using
              the AI Meeting Assistant.
            </p>
          </div>

          <div className="video-shell">
            <video
              className="workflow-video"
              src={workflowVideo}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-label="MEETMIND workflow demonstration video"
            />
          </div>
        </section>

        <section id="features" className="section-shell section-block reveal-up">
          <div className="section-heading">
            <span className="section-heading__eyebrow">Features</span>
            <h2>Built for learning, revision, and meeting productivity.</h2>
            <p>Each feature card keeps the platform focused on study clarity while retaining a premium SaaS feel.</p>
          </div>

          <div className="feature-grid">
            {featureCards.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        <section id="workflow" className="section-shell section-block reveal-up">
          <div className="section-heading">
            <span className="section-heading__eyebrow">Workflow</span>
            <h2>A simple path from login to learning output.</h2>
            <p>The flow is intentionally short so users can move from content intake to revision and meetings quickly.</p>
          </div>

          <div className="workflow-track" aria-label="Workflow steps">
            {workflowSteps.map((step, index) => (
              <Fragment key={step}>
                <div className="workflow-step">
                  <span className="workflow-step__index">0{index + 1}</span>
                  <span className="workflow-step__label">{step}</span>
                </div>
                {index < workflowSteps.length - 1 && (
                  <ChevronRight className="workflow-track__arrow" aria-hidden="true" />
                )}
              </Fragment>
            ))}
          </div>
        </section>

        <section id="why-meetmind" className="section-shell section-block reveal-up">
          <div className="section-heading">
            <span className="section-heading__eyebrow">Why choose MEETMIND</span>
            <h2>Designed to save time while improving learning quality.</h2>
            <p>MEETMIND focuses on the outcomes students and teams care about most: speed, clarity, and retention.</p>
          </div>

          <div className="why-grid">
            {whyChooseItems.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="why-card">
                  <div className="why-card__icon">
                    <Icon aria-hidden="true" />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer id="contact" className="footer-shell">
        <div className="footer-shell__brand">
          <Link to="/" className="brand brand--footer">
            <span className="brand__mark" aria-hidden="true">
              <BrainCircuit />
            </span>
            <span className="brand__copy">
              <span className="brand__title">MEETMIND AI Learning</span>
              <span className="brand__subtitle">Copyright {new Date().getFullYear()} MEETMIND AI Learning</span>
            </span>
          </Link>
          <p>
            A premium AI learning platform for summaries, flashcards, quizzes, study vault organization, and live
            meeting intelligence.
          </p>
        </div>

        <div className="footer-shell__links">
          <h3>Quick Links</h3>
          <div className="footer-shell__list">
            {quickLinks.map((link) => (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="footer-shell__contact">
          <h3>Contact</h3>
          <p>hello@meetmind.ai</p>
          <p>support@meetmind.ai</p>
          <Link to="/login" className="footer-shell__cta">
            Login to continue
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
