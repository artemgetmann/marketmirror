import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import { Instagram, Linkedin, Youtube, ExternalLink, MessagesSquare } from "lucide-react";

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
      
      <div className="flex-1 flex flex-col items-center w-full max-w-2xl mx-auto pt-20 space-y-16">
        {/* Main headline with increased contrast */}
        <h1 className="text-4xl tracking-tight leading-tight text-center mx-auto max-w-lg">
          <span className="font-light">We're Not Wall Street</span>—<br/>
          <span className="font-semibold">We're Better</span>
        </h1>
        
        <div className="story-section text-center space-y-8 max-w-lg mx-auto">
          <div className="text-lg text-gray-700 font-normal pt-2">
            The finance industry rejected me.<br/>
            So I built something better.
          </div>
          
          <div className="text-base text-gray-800 leading-relaxed pt-2">
            Hi, I'm Artem Getman — founder of MarketMirror. When I started investing, the finance world rejected me. I had no degree, no finance pedigree — just extraordinary results.
          </div>
          
          <div className="text-base font-medium text-black leading-tight pt-1">
            Goldman Sachs. UBS. Deutsche Bank.<br/>
            They closed their doors on me.
          </div>
          
          <div className="text-base text-gray-800 leading-relaxed pt-1">
            So I decided to close the doors on them... Forever.
          </div>
        </div>
        
        {/* Stats section with embedded verification link */}
        <div className="flex flex-col items-center mb-2">
          <div className="flex justify-center gap-14 mb-5">
            <div className="text-center">
              <div className="text-xl font-semibold">41%</div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Annual XIRR Returns</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold">$1M</div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Capital Managed</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold">5</div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Years Beating "Elites"</div>
            </div>
          </div>
          
          {/* Embedded verification link */}
          <div className="text-center border-t border-gray-100 pt-3 mt-0">
            <a 
              href="https://etoro.tw/3CmyCIS" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-black transition-colors"
            >
              <ExternalLink size={14} />
              <span>Verify performance on eToro (I don't use it anymore)</span>
            </a>
          </div>
        </div>
                
        {/* Problem section - moved closer to eToro */}
        <div className="bg-gray-50 py-10 px-8 w-full max-w-lg mx-auto text-center space-y-5 mt-16 mb-8">
          <div className="text-lg font-medium">The Problem: Institutional Gatekeeping</div>
          <div className="text-sm text-gray-700 leading-relaxed">
            Wall Street built a system designed to keep you out. Overpriced advisors. Confusing jargon. Information asymmetry.
          </div>
          <div className="text-sm text-gray-700 leading-relaxed">
            They made the rules to benefit them, not you.
          </div>
          <div className="text-sm font-semibold text-black">
            That ends now.
          </div>
        </div>
        
        {/* Rebellion section */}
        <div className="text-center space-y-6 max-w-lg mx-auto my-10">
          <div className="text-2xl font-medium">MarketMirror: The Rebellion</div>
          
          <div className="grid grid-cols-3 gap-6 text-center my-4">
            <div>
              <div className="text-sm font-medium">No Gatekeeping</div>
              <div className="text-xs text-gray-600 leading-snug">Unlimited analysis. No institutional barriers.</div>
            </div>
            <div>
              <div className="text-sm font-medium">No Bullshit</div>
              <div className="text-xs text-gray-600 leading-snug">Straight insights. No jargon or conflicts.</div>
            </div>
            <div>
              <div className="text-sm font-medium">No Suits</div>
              <div className="text-xs text-gray-600 leading-snug">For independent thinkers, hackers, and misfits.</div>
            </div>
          </div>
        </div>
        
        {/* Manifesto */}
        <div className="text-base text-center max-w-lg mx-auto space-y-5 leading-relaxed my-10">
          This is my rebellion. A tool I built for independent thinkers who refuse to accept the status quo. 
          
          <div className="pt-1">
            MarketMirror isn't just AI—it's a movement.<br/>
            Against overpriced advisors.<br/>
            Against institutional gatekeeping.<br/>
            Against the myth that investing requires an MBA.
          </div>
          
          <div className="font-semibold pt-2 text-lg">
            Welcome to the future of investing—<br/>
            built for people who think for themselves.
          </div>
        </div>
        
        {/* CTA - positioned closer to text above */}
        <Link 
          to="/" 
          className="mt-7 px-8 py-3 bg-black text-white rounded-full text-base font-medium hover:bg-gray-800 transition-all"
        >
          Join the Rebellion →
        </Link>
        
        {/* Telegram group link */}
        <div className="mt-8 text-center">
          <a 
            href="https://t.me/mk_mirror" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-black transition-colors"
          >
            <MessagesSquare size={16} />
            <span>Join our Telegram community</span>
          </a>
        </div>
        
        {/* Social Links */}
        <div className="flex justify-center gap-6 pt-16 pb-6">
          <a 
            href="https://www.instagram.com/artemgetman_/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-900"
            aria-label="Instagram"
          >
            <Instagram size={15} />
          </a>
          
          <a 
            href="https://www.linkedin.com/in/artem-g-862a69226/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-900"
            aria-label="LinkedIn"
          >
            <Linkedin size={15} />
          </a>
          
          <a 
            href="https://x.com/artemgetman_" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-900"
            aria-label="X (Twitter)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/>
            </svg>
          </a>
          
          <a 
            href="https://www.youtube.com/@artem_getman" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-900"
            aria-label="YouTube"
          >
            <Youtube size={15} />
          </a>
        </div>
      </div>
      
      <div className="text-center text-xs text-gray-300 mt-6 mb-4">
        MarketMirror is in Beta
      </div>
    </div>
  );
};

export default About;
