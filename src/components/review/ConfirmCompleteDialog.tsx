import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface ConfirmCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemWord: string;
}

export function ConfirmCompleteDialog({
  open,
  onOpenChange,
  onConfirm,
  itemWord
}: ConfirmCompleteDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>리뷰 처리 완료</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-slate-800">"{itemWord}"</span> 아이템의 리뷰 결과를 처리완료로 표시하면 다시 볼 수 없습니다.
            <br />
            <br />
            계속하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-green-600 hover:bg-green-700"
          >
            처리완료
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
