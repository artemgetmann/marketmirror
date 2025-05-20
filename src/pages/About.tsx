import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col px-4 py-6 bg-white">
      <div className="absolute top-6 left-6">
        <Logo />
      </div>
      
      <Link 
        to="/" 
        className="absolute top-6 right-6 text-gray-600 hover:text-gray-900"
      >
        Back
      </Link>
      
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xl mx-auto text-center space-y-8 pt-16">
        <h1 className="text-4xl font-medium text-black">We're Not Wall Street—We're Better.</h1>
        
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
          Join our financial rebellion—beat Wall Street at its own game.
        </p>
        
        <Link 
          to="/" 
          className="mt-8 px-8 py-3 bg-black text-white rounded-full text-lg hover:bg-gray-800 transition-colors"
        >
          Get Started
        </Link>
      </div>
      
      <div className="text-center text-sm text-gray-500 mt-12">
        MarketMirror is in Beta
      </div>
    </div>
  );
};

export default About;
