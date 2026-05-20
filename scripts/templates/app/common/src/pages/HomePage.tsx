import styled from 'styled-components';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Hero = styled.section`
  text-align: center;
  padding: 4rem 0;
`;

const Title = styled.h1`
  font-size: 3rem;
  color: #333;
  margin-bottom: 1rem;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 2rem;
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
`;

const FeatureCard = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const FeatureIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 1rem;
`;

const FeatureTitle = styled.h3`
  color: #333;
  margin-bottom: 1rem;
`;

const FeatureDescription = styled.p`
  color: #666;
  font-size: 0.9rem;
`;

const TemplateInfo = styled.div`
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 2rem 0;
  text-align: center;
`;

export const HomePage = () => {
  return (
    <Container>
      <Hero>
        <Title>Welcome to {{APP_NAME}}</Title>
        <Subtitle>Your new React application is ready!</Subtitle>
        
        <TemplateInfo>
          <strong>Template:</strong> {{TEMPLATE_NAME}} - {{TEMPLATE_DESCRIPTION}}
        </TemplateInfo>
      </Hero>

      <FeaturesGrid>
        {{{TEMPLATE_FEATURES_JSON}}.map((feature, index) => (
          <FeatureCard key={index}>
            <FeatureIcon>✨</FeatureIcon>
            <FeatureTitle>{feature}</FeatureTitle>
            <FeatureDescription>
              {feature} is ready to use in your application.
            </FeatureDescription>
          </FeatureCard>
        ))}
      </FeaturesGrid>
    </Container>
  );
};