import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Github, Linkedin, Twitter, Download, ChevronDown } from 'lucide-react';
import heroBg from '@/assets/hero-bg.jpg';

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const socialLinks = [
    {
      icon: Github,
      href: 'https://github.com/Toniakbanares',
      label: 'GitHub'
    },
    {
      icon: Linkedin,
      href: 'https://www.linkedin.com/in/jaques-dutra-14b805226',
      label: 'LinkedIn'
    },
    {
      icon: Twitter,
      href: 'https://x.com/jasu_sn?s=09',
      label: 'Twitter'
    }
  ];

  return (
    <section 
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `url(${heroBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-background/95" />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 bg-gradient-hero opacity-50" />
      
      {/* Main Content */}
      <div className={`relative z-10 text-center max-w-4xl mx-auto px-6 transition-all duration-1000 ${
        isVisible ? 'animate-fade-in' : 'opacity-0'
      }`}>
        
        {/* Name & Title */}
        <div className="mb-8">
          <h1 className="text-6xl md:text-8xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            RAMDUT
          </h1>
          <h2 className="text-2xl md:text-4xl font-light text-foreground mb-2">
            Jaques Dutra
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Tecnólogo em Análise e Desenvolvimento de Sistemas | Universidade Feevale
          </p>
        </div>

        {/* Tagline */}
        <div className="mb-12">
          <p className="text-xl md:text-2xl text-foreground font-medium mb-4">
            Construindo o futuro através do código
          </p>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            Apaixonado por desenvolvimento de sistemas, arquitetura de software e design UI/UX. 
            Sempre em busca de soluções inovadoras e tecnologias emergentes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button 
            size="lg" 
            className="group bg-gradient-primary hover:shadow-glow transition-all duration-300"
          >
            <Download className="mr-2 h-5 w-5 group-hover:animate-bounce" />
            Download CV
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-300"
          >
            Ver Projetos
          </Button>
        </div>

        {/* Social Links */}
        <div className="flex justify-center gap-6 mb-16">
          {socialLinks.map((social, index) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`group p-3 rounded-full border border-muted hover:border-primary transition-all duration-300 hover:scale-110 hover:shadow-glow bg-card/50 backdrop-blur-sm ${
                isVisible ? 'animate-slide-in-right' : 'opacity-0'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
              aria-label={social.label}
            >
              <social.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
            </a>
          ))}
        </div>

        {/* Scroll Indicator */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center animate-bounce">
            <span className="text-sm text-muted-foreground mb-2">Explore mais</span>
            <ChevronDown className="h-6 w-6 text-primary" />
          </div>
        </div>
      </div>

      {/* Floating Particles Effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-primary/20 rounded-full animate-glow-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroSection;