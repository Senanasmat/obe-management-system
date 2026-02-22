import Swal from 'sweetalert2';

export const toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

export const showAlert = (title, text, icon = 'info') => {
    return Swal.fire({
        title,
        text,
        icon,
        confirmButtonColor: '#0d6efd',
        confirmButtonText: 'OK'
    });
};

export const showConfirm = (title, text, confirmButtonText = 'Yes, delete it!') => {
    return Swal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText
    });
};

export const showSuccess = (title, text) => {
    return Swal.fire({
        title,
        text,
        icon: 'success',
        confirmButtonColor: '#198754'
    });
};

export const showError = (title, text) => {
    return Swal.fire({
        title,
        text,
        icon: 'error',
        confirmButtonColor: '#dc3545'
    });
};
