"use client";

import React from "react";

interface DeleteConfirmButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  confirmMessage: string;
}

export function DeleteConfirmButton({ confirmMessage, children, onClick, ...props }: DeleteConfirmButtonProps) {
  return (
    <button
      {...props}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}
