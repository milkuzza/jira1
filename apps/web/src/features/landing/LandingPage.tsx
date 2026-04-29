// apps/web/src/features/landing/LandingPage.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './landing.css';

/* ─── tiny helpers ─────────────────────────────────────── */
const useInView = (threshold = 0.15) => {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
};

/* ─── data ─────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: '⚡',
    title: 'Kanban & Scrum',
    desc: 'Drag-and-drop доски, спринты и бэклог в одном месте. Переключайтесь между методологиями без перенастройки.',
  },
  {
    icon: '🔔',
    title: 'Уведомления в реальном времени',
    desc: 'WebSocket-уведомления о каждом изменении задачи. Никакой ручной проверки — всё приходит само.',
  },
  {
    icon: '👥',
    title: 'Командная работа',
    desc: 'Приглашайте участников по email, назначайте роли Admin / PM / Developer / Viewer и управляйте доступом.',
  },
  {
    icon: '🏢',
    title: 'Мультитенантность',
    desc: 'Каждая организация получает свой поддомен и изолированное пространство данных.',
  },
  {
    icon: '📊',
    title: 'Бэклог & Приоритеты',
    desc: 'Управляйте приоритетами HIGHEST → LOWEST, статусами и назначением одним кликом.',
  },
  {
    icon: '🔍',
    title: 'Глобальный поиск',
    desc: 'Мгновенный поиск по задачам, проектам и участникам. Последние просмотренные задачи всегда под рукой.',
  },
];

const PLANS = [
  {
    name: 'Free',
    price: '0',
    period: 'навсегда',
    highlight: false,
    features: ['3 проекта', '5 участников', '1 ГБ хранилища', 'Kanban-доска', 'Email-уведомления'],
  },
  {
    name: 'Pro',
    price: '790',
    period: 'мес / орг',
    highlight: true,
    badge: 'Популярный',
    features: ['Неограниченные проекты', '25 участников', '20 ГБ хранилища', 'Kanban + Scrum', 'Приоритетная поддержка', 'Расширенная аналитика'],
  },
  {
    name: 'Enterprise',
    price: '2 490',
    period: 'мес / орг',
    highlight: false,
    features: ['Всё из Pro', 'Неограниченные участники', '200 ГБ хранилища', 'SSO / SAML', 'SLA 99.9%', 'Выделенный менеджер'],
  },
];

const TESTIMONIALS = [
  {
    text: 'TaskHub заменил нам Jira и Linear одновременно. Команда из 18 человек перешла за один день.',
    name: 'Алексей Морозов',
    role: 'CTO, Fintech Startup',
    avatar: 'АМ',
  },
  {
    text: 'Мультитенантность и разграничение ролей — именно то, чего нам не хватало в других инструментах.',
    name: 'Мария Соколова',
    role: 'Product Manager, E-commerce',
    avatar: 'МС',
  },
  {
    text: 'Наконец-то трекер, который не тормозит. Реалтайм-обновления работают безупречно.',
    name: 'Дмитрий Козлов',
    role: 'Lead Developer, SaaS Company',
    avatar: 'ДК',
  },
];

/* ─── sub-components ───────────────────────────────────── */

const NavBar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`}>
      <div className="lp-nav__inner">
        <a href="#" className="lp-logo">
          <span className="lp-logo__icon">◈</span>
          TaskHub
        </a>
        <ul className="lp-nav__links">
          <li><a href="#features">Возможности</a></li>
          <li><a href="#pricing">Тарифы</a></li>
          <li><a href="#testimonials">Отзывы</a></li>
        </ul>
        <div className="lp-nav__cta">
          <Link to="/login" className="lp-btn lp-btn--ghost">Войти</Link>
          <Link to="/register" className="lp-btn lp-btn--primary">Начать бесплатно</Link>
        </div>
      </div>
    </nav>
  );
};

const HeroSection: React.FC = () => (
  <section className="lp-hero">
    {/* ambient orbs */}
    <div className="lp-orb lp-orb--1" />
    <div className="lp-orb lp-orb--2" />
    <div className="lp-orb lp-orb--3" />

    <div className="lp-hero__content">
      <div className="lp-badge">✦ Управление задачами нового поколения</div>
      <h1 className="lp-hero__title">
        Доставляйте продукты<br />
        <span className="lp-gradient-text">быстрее вместе</span>
      </h1>
      <p className="lp-hero__sub">
        TaskHub объединяет Kanban, Scrum, командные роли и уведомления в реальном времени
        в одном элегантном рабочем пространстве.
      </p>
      <div className="lp-hero__actions">
        <Link to="/register" className="lp-btn lp-btn--primary lp-btn--lg">
          Начать бесплатно
          <span className="lp-btn__arrow">→</span>
        </Link>
        <a href="#features" className="lp-btn lp-btn--ghost lp-btn--lg">
          Смотреть демо
        </a>
      </div>
      <p className="lp-hero__note">Не требует карты · Бесплатно навсегда · Без скрытых платежей</p>
    </div>

    {/* mock dashboard */}
    <div className="lp-hero__mockup">
      <MockDashboard />
    </div>
  </section>
);

const MockDashboard: React.FC = () => (
  <div className="lp-mock">
    <div className="lp-mock__header">
      <div className="lp-mock__dots">
        <span /><span /><span />
      </div>
      <span className="lp-mock__title">TaskHub — Sprint #12</span>
    </div>
    <div className="lp-mock__body">
      <div className="lp-mock__sidebar">
        {['◈ TaskHub', '📋 Проекты', '📌 Доска', '📝 Бэклог', '👥 Команда', '⚙️ Настройки'].map((item) => (
          <div key={item} className="lp-mock__sidebar-item">{item}</div>
        ))}
      </div>
      <div className="lp-mock__board">
        {[
          { col: 'Todo', color: '#64748b', cards: ['Дизайн онбординга', 'API авторизации'] },
          { col: 'In Progress', color: '#6366f1', cards: ['WebSocket уведомления', 'Kanban drag&drop'] },
          { col: 'Done', color: '#22c55e', cards: ['База данных', 'Мультитенантность'] },
        ].map(({ col, color, cards }) => (
          <div className="lp-mock__col" key={col}>
            <div className="lp-mock__col-title" style={{ color }}>{col}</div>
            {cards.map((c) => (
              <div className="lp-mock__card" key={c}>
                <div className="lp-mock__card-text">{c}</div>
                <div className="lp-mock__card-meta">
                  <div className="lp-mock__avatar" />
                  <div className="lp-mock__tag" style={{ background: color + '22', color }}>
                    {col === 'Done' ? '✓' : col === 'In Progress' ? '●' : '○'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const FeaturesSection: React.FC = () => {
  const { ref, visible } = useInView();
  return (
    <section id="features" className="lp-section" ref={ref as React.Ref<HTMLElement>}>
      <div className="lp-section__label">Возможности</div>
      <h2 className="lp-section__title">Всё, что нужно вашей команде</h2>
      <p className="lp-section__sub">Мощные инструменты, интуитивный интерфейс, нулевой порог входа.</p>
      <div className={`lp-features-grid${visible ? ' lp-animate-in' : ''}`}>
        {FEATURES.map((f, i) => (
          <div className="lp-feature-card" key={f.title} style={{ '--delay': `${i * 80}ms` } as React.CSSProperties}>
            <div className="lp-feature-card__icon">{f.icon}</div>
            <h3 className="lp-feature-card__title">{f.title}</h3>
            <p className="lp-feature-card__desc">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const PricingSection: React.FC = () => {
  const { ref, visible } = useInView();
  return (
    <section id="pricing" className="lp-section lp-section--alt" ref={ref as React.Ref<HTMLElement>}>
      <div className="lp-section__label">Тарифы</div>
      <h2 className="lp-section__title">Прозрачные цены</h2>
      <p className="lp-section__sub">Начните бесплатно, масштабируйтесь по мере роста.</p>
      <div className={`lp-pricing-grid${visible ? ' lp-animate-in' : ''}`}>
        {PLANS.map((plan, i) => (
          <div
            key={plan.name}
            className={`lp-plan${plan.highlight ? ' lp-plan--highlight' : ''}`}
            style={{ '--delay': `${i * 100}ms` } as React.CSSProperties}
          >
            {plan.badge && <div className="lp-plan__badge">{plan.badge}</div>}
            <div className="lp-plan__name">{plan.name}</div>
            <div className="lp-plan__price">
              <span className="lp-plan__currency">₽</span>
              <span className="lp-plan__amount">{plan.price}</span>
            </div>
            <div className="lp-plan__period">{plan.period}</div>
            <ul className="lp-plan__features">
              {plan.features.map((f) => (
                <li key={f}><span className="lp-plan__check">✓</span>{f}</li>
              ))}
            </ul>
            <Link to="/register" className={`lp-btn lp-btn--${plan.highlight ? 'primary' : 'outline'} lp-btn--full`}>
              {plan.price === '0' ? 'Начать бесплатно' : 'Выбрать план'}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
};

const TestimonialsSection: React.FC = () => {
  const { ref, visible } = useInView();
  return (
    <section id="testimonials" className="lp-section" ref={ref as React.Ref<HTMLElement>}>
      <div className="lp-section__label">Отзывы</div>
      <h2 className="lp-section__title">Командам нравится TaskHub</h2>
      <div className={`lp-testimonials-grid${visible ? ' lp-animate-in' : ''}`}>
        {TESTIMONIALS.map((t, i) => (
          <div
            className="lp-testimonial"
            key={t.name}
            style={{ '--delay': `${i * 100}ms` } as React.CSSProperties}
          >
            <div className="lp-testimonial__quote">"</div>
            <p className="lp-testimonial__text">{t.text}</p>
            <div className="lp-testimonial__author">
              <div className="lp-testimonial__avatar">{t.avatar}</div>
              <div>
                <div className="lp-testimonial__name">{t.name}</div>
                <div className="lp-testimonial__role">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const CtaSection: React.FC = () => (
  <section className="lp-cta">
    <div className="lp-orb lp-orb--cta" />
    <div className="lp-cta__content">
      <h2 className="lp-cta__title">Готовы начать?</h2>
      <p className="lp-cta__sub">Настройте рабочее пространство за 2 минуты. Бесплатно.</p>
      <Link to="/register" className="lp-btn lp-btn--primary lp-btn--lg lp-btn--glow">
        Создать аккаунт бесплатно
        <span className="lp-btn__arrow">→</span>
      </Link>
    </div>
  </section>
);

const Footer: React.FC = () => (
  <footer className="lp-footer">
    <div className="lp-footer__inner">
      <div className="lp-footer__brand">
        <a href="#" className="lp-logo">
          <span className="lp-logo__icon">◈</span>
          TaskHub
        </a>
        <p>Управление задачами для современных команд.</p>
      </div>
      <div className="lp-footer__links">
        <div className="lp-footer__col">
          <div className="lp-footer__col-title">Продукт</div>
          <a href="#features">Возможности</a>
          <a href="#pricing">Тарифы</a>
          <a href="#testimonials">Отзывы</a>
        </div>
        <div className="lp-footer__col">
          <div className="lp-footer__col-title">Компания</div>
          <a href="#">О нас</a>
          <a href="#">Блог</a>
          <a href="#">Карьера</a>
        </div>
        <div className="lp-footer__col">
          <div className="lp-footer__col-title">Правовое</div>
          <a href="#">Конфиденциальность</a>
          <a href="#">Условия</a>
          <a href="#">Cookie</a>
        </div>
      </div>
    </div>
    <div className="lp-footer__bottom">
      © {new Date().getFullYear()} TaskHub. Все права защищены.
    </div>
  </footer>
);

/* ─── main export ──────────────────────────────────────── */
const LandingPage: React.FC = () => (
  <div className="lp-root">
    <NavBar />
    <HeroSection />
    <FeaturesSection />
    <PricingSection />
    <TestimonialsSection />
    <CtaSection />
    <Footer />
  </div>
);

export default LandingPage;
