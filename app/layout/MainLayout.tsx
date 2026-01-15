import React from "react";
import { useAuthentication } from "~/features/authentication /provider/AuthenticationProvider";
import { Button } from "../components/ui/button";
import {
  ArrowLeft,
  User as UserIcon,
  FileText,
  Package,
  Users,
  History,
} from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: "quotation" | "packages" | "clients" | "history";
  onTabChange: (tab: "quotation" | "packages" | "clients" | "history") => void;
  step: "form" | "preview";
  onBackToForm: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  step,
  onBackToForm,
}) => {
  const { user } = useAuthentication();

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex justify-between items-center sticky top-0 z-50 no-print shadow-sm">
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-slate-900 text-white w-8 h-8 rounded-md flex items-center justify-center font-bold text-lg italic montserrat shrink-0">
              M
            </div>
            <div className="block">
              <h1 className="text-xs md:text-sm font-bold text-slate-900 leading-none">
                MKM CMS
              </h1>
              <p className="text-[9px] md:text-[10px] text-slate-500 uppercase font-medium tracking-tight">
                Umrah & Travel
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          {/* <nav className="hidden xl:flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => onTabChange("quotation")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === "quotation"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Builder
            </button>
            <button
              onClick={() => onTabChange("history")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === "history"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <History className="w-3.5 h-3.5" /> Quotations
            </button>
            <button
              onClick={() => onTabChange("packages")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === "packages"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Package className="w-3.5 h-3.5" /> Packages
            </button>
            <button
              onClick={() => onTabChange("clients")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === "clients"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Clients
            </button>
          </nav> */}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {activeTab === "quotation" && step === "preview" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToForm}
              className="gap-1 md:gap-2 text-slate-600 px-2 h-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" />{" "}
              <span className="text-xs">Edit</span>
            </Button>
          )}
          <div className="hidden md:block h-6 w-[1px] bg-slate-200 mx-1"></div>
          {/* <div className="flex items-center gap-2 md:gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-900 leading-none">
                {user?.name}
              </p>
              <p className="text-[10px] text-slate-500 leading-none mt-1">
                {user?.office}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 shrink-0">
              <UserIcon className="w-4 h-4" />
            </div>
          </div> */}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 lg:p-10 max-w-[1440px] mx-auto w-full mb-20 md:mb-0">
        {children}
      </main>

      {/* Mobile Navigation Bar (Fixed Bottom) */}
      {/* <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center py-1 px-4 z-50 no-print shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => onTabChange("quotation")}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            activeTab === "quotation" ? "text-slate-900" : "text-slate-400"
          }`}
        >
          <div
            className={`p-1.5 rounded-md ${
              activeTab === "quotation" ? "bg-slate-900 text-white" : ""
            }`}
          >
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider">
            Builder
          </span>
        </button>

        <button
          onClick={() => onTabChange("history")}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            activeTab === "history" ? "text-slate-900" : "text-slate-400"
          }`}
        >
          <div
            className={`p-1.5 rounded-md ${
              activeTab === "history" ? "bg-slate-900 text-white" : ""
            }`}
          >
            <History className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider">
            History
          </span>
        </button>

        <button
          onClick={() => onTabChange("packages")}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            activeTab === "packages" ? "text-slate-900" : "text-slate-400"
          }`}
        >
          <div
            className={`p-1.5 rounded-md ${
              activeTab === "packages" ? "bg-slate-900 text-white" : ""
            }`}
          >
            <Package className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider">
            Pkgs
          </span>
        </button>

        <button
          onClick={() => onTabChange("clients")}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            activeTab === "clients" ? "text-slate-900" : "text-slate-400"
          }`}
        >
          <div
            className={`p-1.5 rounded-md ${
              activeTab === "clients" ? "bg-slate-900 text-white" : ""
            }`}
          >
            <Users className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider">
            Clients
          </span>
        </button>
      </nav> */}

      <footer className="bg-white border-t border-slate-200 py-6 px-10 text-center no-print hidden md:block">
        <p className="text-xs text-slate-400 font-medium">
          © 2025 MKM Ticketing Travel & Tours Sdn Bhd. Internal use only.
        </p>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideIn { animation: slideIn 0.3s ease-out; }
        
        .overflow-x-auto {
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </div>
  );
};

export default MainLayout;
