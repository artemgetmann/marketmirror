import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import { Instagram, Linkedin, Youtube } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col px-4 py-6 bg-white">
      <div className="absolute top-6 left-6">
        <Logo />
      </div>
      
      <Link 
        to="/" 
        className="absolute top-11 right-6 text-gray-600 hover:text-gray-900 flex items-center gap-1 font-medium"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Back
      </Link>
      
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xl mx-auto text-center space-y-8 pt-16">
        <h1 className="text-4xl font-medium text-black">We're Not Wall Street—We're Better</h1>
        
        <div className="border-t border-gray-200 w-24 my-2"></div>
        
        <div className="space-y-6 text-left">
          <p className="text-gray-800 leading-relaxed">
            Hi, I'm Artem Getman. When I started investing, the finance world rejected me. 
            I had no degree, no finance pedigree—just extraordinary results. 
            Institutions like Goldman Sachs, UBS, and Deutsche Bank closed their doors on me. 
            So I decided to close the doors on them… Forever ;)
          </p>
          
          <p className="text-gray-800 leading-relaxed">
            Five years later, I'm managing $1 million of private capital and generating 
            verifiable returns of 41% annually—consistently beating those so-called 'elite' investors.
          </p>
          
          <p className="text-gray-800 leading-relaxed">
            MarketMirror is my rebellion. A tool for independent thinkers, hackers, rebels, 
            and misfits—simplifying finance so anyone can invest clearly, intelligently, and powerfully.
          </p>
        </div>
        
        <div className="border-t border-gray-200 w-24 my-2"></div>
        
        <p className="text-xl font-medium text-gray-800">
          Join our financial rebellion—beat Wall Street at its own game
        </p>
        
        <Link 
          to="/" 
          className="mt-8 px-8 py-3 bg-black text-white rounded-full text-lg hover:bg-gray-800 transition-colors"
        >
         Let's Go! 
        </Link>
        
        <div className="border-t border-gray-200 w-24 my-6"></div>
        
        <div className="flex flex-col items-center mt-4">
          <p className="text-gray-700 mb-4">Connect with Artem:</p>
          
          <div className="flex gap-6 flex-wrap justify-center">
            <a 
              href="https://www.instagram.com/artemgetman_/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <Instagram size={20} />
              <span>Instagram</span>
            </a>
            
            <a 
              href="https://www.linkedin.com/in/artem-g-862a69226/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <Linkedin size={20} />
              <span>LinkedIn</span>
            </a>
            
            <a 
              href="https://x.com/artemgetman_" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/>
              </svg>
              <span>X (Twitter)</span>
            </a>
            
            <a 
              href="https://www.youtube.com/@artem_getman" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <Youtube size={20} />
              <span>YouTube</span>
            </a>
          </div>
        </div>
      </div>
      
      <div className="text-center text-sm text-gray-500 mt-12">
        MarketMirror is in Beta
      </div>
    </div>
  );
};

export default About;
