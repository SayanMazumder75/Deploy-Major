const FeatureCard = ({ icon: Icon, title, description, accent = '#c084fc' }) => {
  return (
    <article className="feature-card" style={{ '--card-accent': accent }}>
      <div className="feature-card__icon-wrap">
        <Icon className="feature-card__icon" aria-hidden="true" />
      </div>
      <h3 className="feature-card__title">{title}</h3>
      <p className="feature-card__description">{description}</p>
    </article>
  );
};

export default FeatureCard;
