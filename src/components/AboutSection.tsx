import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code, Lightbulb, Target, Users } from 'lucide-react';

const AboutSection = () => {
  const values = [
    {
      icon: Code,
      title: 'Tecnologia',
      description: 'Apaixonado por desenvolvimento de sistemas e sempre explorando novas tecnologias.'
    },
    {
      icon: Lightbulb,
      title: 'Inovação',
      description: 'Busco constantemente soluções criativas e eficientes para problemas complexos.'
    },
    {
      icon: Target,
      title: 'Foco',
      description: 'Dedicado ao aprendizado contínuo e ao aperfeiçoamento das habilidades técnicas.'
    },
    {
      icon: Users,
      title: 'Colaboração',
      description: 'Acredito no poder do trabalho em equipe e na troca de conhecimentos.'
    }
  ];

  const skills = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 
    'HTML5', 'CSS3', 'Git', 'Firebase', 'Supabase', 'UI/UX Design'
  ];

  return (
    <section className="py-20 px-6 bg-gradient-secondary">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-6">
            Sobre Mim
          </h2>
          <div className="w-24 h-1 bg-gradient-primary mx-auto rounded-full mb-8" />
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Bio Text */}
          <div className="space-y-6">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-lg leading-relaxed text-foreground">
                Olá! Sou <strong>Jaques Dutra</strong>, estudante de Tecnologia em Análise e 
                Desenvolvimento de Sistemas na <strong>Universidade Feevale</strong>. Minha 
                jornada na tecnologia começou com a curiosidade sobre como as coisas funcionam 
                e evoluiu para uma paixão genuína por criar soluções digitais.
              </p>
              
              <p className="text-lg leading-relaxed text-foreground">
                Durante meus estudos, tenho me dedicado especialmente ao desenvolvimento 
                front-end e back-end, com foco em criar experiências de usuário excepcionais 
                e sistemas robustos. Acredito que a tecnologia deve ser acessível e 
                útil para todos.
              </p>
              
              <p className="text-lg leading-relaxed text-foreground">
                Quando não estou codificando, gosto de explorar novas tecnologias, 
                contribuir para projetos open source e compartilhar conhecimento com 
                a comunidade de desenvolvedores.
              </p>
            </div>

            {/* Skills Tags */}
            <div className="pt-6">
              <h3 className="text-xl font-semibold mb-4 text-foreground">
                Tecnologias & Habilidades
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge 
                    key={skill} 
                    variant="secondary"
                    className="text-sm py-2 px-3 bg-card hover:bg-primary hover:text-primary-foreground transition-colors duration-300 cursor-default"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Values Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {values.map((value, index) => (
              <Card 
                key={value.title}
                className="p-6 bg-card/50 backdrop-blur-sm border-muted hover:border-primary/30 transition-all duration-300 hover:shadow-card group cursor-default"
              >
                <div className="mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <value.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                    {value.title}
                  </h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {value.description}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white rounded-full text-lg font-medium">
            <span>Vamos construir algo incrível juntos!</span>
            <Code className="h-5 w-5" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;