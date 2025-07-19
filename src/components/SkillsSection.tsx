import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Code, 
  Database, 
  Smartphone, 
  Cloud, 
  Palette, 
  GitBranch,
  Globe,
  Shield
} from 'lucide-react';

const SkillsSection = () => {
  const skillCategories = [
    {
      title: 'Frontend',
      icon: Code,
      color: 'from-blue-500 to-cyan-500',
      skills: [
        { name: 'HTML5/CSS3', level: 90 },
        { name: 'JavaScript', level: 85 },
        { name: 'TypeScript', level: 80 },
        { name: 'React', level: 85 },
        { name: 'Vue.js', level: 70 },
        { name: 'TailwindCSS', level: 90 }
      ]
    },
    {
      title: 'Backend',
      icon: Database,
      color: 'from-green-500 to-emerald-500',
      skills: [
        { name: 'Node.js', level: 80 },
        { name: 'Python', level: 75 },
        { name: 'Express.js', level: 80 },
        { name: 'FastAPI', level: 70 },
        { name: 'PostgreSQL', level: 75 },
        { name: 'MongoDB', level: 70 }
      ]
    },
    {
      title: 'Mobile',
      icon: Smartphone,
      color: 'from-purple-500 to-pink-500',
      skills: [
        { name: 'React Native', level: 75 },
        { name: 'Flutter', level: 60 },
        { name: 'Ionic', level: 65 },
        { name: 'PWA', level: 80 }
      ]
    },
    {
      title: 'DevOps & Cloud',
      icon: Cloud,
      color: 'from-orange-500 to-red-500',
      skills: [
        { name: 'Git/GitHub', level: 85 },
        { name: 'Docker', level: 70 },
        { name: 'AWS', level: 60 },
        { name: 'Firebase', level: 80 },
        { name: 'Supabase', level: 85 }
      ]
    },
    {
      title: 'Design & UX',
      icon: Palette,
      color: 'from-indigo-500 to-purple-500',
      skills: [
        { name: 'UI/UX Design', level: 75 },
        { name: 'Figma', level: 80 },
        { name: 'Prototyping', level: 70 },
        { name: 'Design Systems', level: 75 }
      ]
    },
    {
      title: 'Ferramentas',
      icon: GitBranch,
      color: 'from-gray-500 to-gray-700',
      skills: [
        { name: 'VSCode', level: 90 },
        { name: 'Postman', level: 85 },
        { name: 'Jest', level: 70 },
        { name: 'Webpack', level: 65 }
      ]
    }
  ];

  const certifications = [
    {
      title: 'Análise e Desenvolvimento de Sistemas',
      institution: 'Universidade Feevale',
      status: 'Em andamento',
      year: '2024',
      type: 'Graduação'
    },
    {
      title: 'React Development',
      institution: 'Meta Professional Certificate',
      status: 'Concluído',
      year: '2023',
      type: 'Certificação'
    },
    {
      title: 'JavaScript Algorithms',
      institution: 'freeCodeCamp',
      status: 'Concluído',
      year: '2023',
      type: 'Certificação'
    },
    {
      title: 'Cloud Computing Fundamentals',
      institution: 'AWS',
      status: 'Em andamento',
      year: '2024',
      type: 'Certificação'
    }
  ];

  return (
    <section className="py-20 px-6 bg-gradient-secondary">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-6">
            Habilidades & Conhecimentos
          </h2>
          <div className="w-24 h-1 bg-gradient-primary mx-auto rounded-full mb-8" />
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tecnologias e ferramentas que domino, sempre em constante evolução e aprendizado.
          </p>
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {skillCategories.map((category, index) => (
            <Card 
              key={category.title}
              className="p-6 bg-card/50 backdrop-blur-sm border-muted hover:border-primary/30 transition-all duration-300 hover:shadow-card group"
            >
              {/* Category Header */}
              <div className="flex items-center mb-6">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${category.color} flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300`}>
                  <category.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                  {category.title}
                </h3>
              </div>

              {/* Skills List */}
              <div className="space-y-4">
                {category.skills.map((skill) => (
                  <div key={skill.name}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-foreground">
                        {skill.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {skill.level}%
                      </span>
                    </div>
                    <Progress 
                      value={skill.level} 
                      className="h-2 bg-muted"
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Education & Certifications */}
        <div>
          <h3 className="text-3xl font-bold text-center mb-12 bg-gradient-primary bg-clip-text text-transparent">
            Formação & Certificações
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certifications.map((cert, index) => (
              <Card 
                key={cert.title}
                className="p-6 bg-card border-muted hover:border-primary/30 transition-all duration-300 hover:shadow-card group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300 mb-1">
                      {cert.title}
                    </h4>
                    <p className="text-muted-foreground text-sm mb-2">
                      {cert.institution}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={cert.status === 'Concluído' ? 'default' : 'secondary'}
                      className={cert.status === 'Concluído' ? 'bg-gradient-primary' : ''}
                    >
                      {cert.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {cert.type}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {cert.year}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
          {[
            { icon: Code, label: 'Projetos', value: '15+' },
            { icon: GitBranch, label: 'Commits', value: '500+' },
            { icon: Globe, label: 'Tecnologias', value: '20+' },
            { icon: Shield, label: 'Experiência', value: '2 anos' }
          ].map((stat, index) => (
            <div 
              key={stat.label}
              className="text-center p-6 bg-card/30 backdrop-blur-sm rounded-lg border border-muted hover:border-primary/30 transition-all duration-300 group"
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SkillsSection;