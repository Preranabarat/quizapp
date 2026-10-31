import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";
import { CreditCard, AlertCircle } from "lucide-react";
import Link from "next/link";

interface InsufficientCreditsDialogProps {
  open: boolean;
  onClose: () => void;
}

const InsufficientCreditsDialog: React.FC<InsufficientCreditsDialogProps> = ({
  open,
  onClose,
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-red-400/10 bg-black/95">
        <DialogHeader className="flex flex-col items-center">
          <div className="bg-red-500/10 p-3 rounded-full mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <DialogTitle className="text-xl text-center">Insufficient Credits</DialogTitle>
          <DialogDescription className="text-center pt-2">
            You don't have enough credits to create or join a quiz room. Each game requires 1 credit.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 py-4 text-center text-zinc-300">
          <p>
            Get more credits to continue playing and testing your knowledge with other players.
          </p>
          <div className="bg-zinc-800/70 p-4 rounded-lg">
            <div className="text-2xl font-bold text-white mb-2">1 Credit = 1 Game</div>
            <p className="text-sm text-zinc-400">
              Credits are used for both creating and joining quiz rooms.
            </p>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-center gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="sm:w-auto"
          >
            Cancel
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 sm:w-auto" asChild>
            <Link href="/credits">
              <CreditCard className="mr-2 h-4 w-4" />
              Get Credits
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InsufficientCreditsDialog; 