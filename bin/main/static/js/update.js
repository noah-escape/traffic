document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('newImages');
    const fileListContainer = document.getElementById('file-list');
    const originalSubject = document.getElementById('originalSubject').value.trim();
    const originalContent = document.getElementById('originalContent').value.trim();

    // 에러 메시지 처리
    const errorMessage = /*[[${error}]]*/ '';
    if (errorMessage) {
        alert(errorMessage);
    }

    // 이미지 파일 검증
    fileInput.addEventListener('change', function () {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        const files = fileInput.files;
        let hasInvalidFile = false;

        for (let file of files) {
            const ext = file.name.split('.').pop().toLowerCase();
            const type = file.type;

            if (!allowedExtensions.includes(ext) || !allowedTypes.includes(type)) {
                hasInvalidFile = true;
                break;
            }
        }

        if (hasInvalidFile) {
            alert('이미지 파일만 업로드 가능합니다! (jpg, png, gif 등)');
            fileInput.value = ''; // 초기화
            fileListContainer.innerHTML = ''; // 리스트 초기화
        }
    });

    // 파일 리스트 업데이트 및 삭제 처리
    fileInput.addEventListener('change', function (e) {
        fileListContainer.innerHTML = '';  // 기존 목록 초기화
        let fileArray = Array.from(e.target.files);

        if (fileArray.length > 0) {
            fileArray.forEach(function (file) {
                const fileItem = document.createElement('div');
                fileItem.classList.add('d-flex', 'justify-content-between', 'align-items-center', 'my-2');

                const fileName = document.createElement('span');
                fileName.textContent = file.name;
                fileName.classList.add('file-name');

                const closeButton = document.createElement('button');
                closeButton.textContent = 'X';
                closeButton.classList.add('btn', 'btn-danger', 'btn-sm');
                closeButton.addEventListener('click', function () {
                    fileArray = fileArray.filter(f => f !== file);
                    fileListContainer.removeChild(fileItem);

                    const dataTransfer = new DataTransfer();
                    fileArray.forEach(f => dataTransfer.items.add(f));
                    fileInput.files = dataTransfer.files;
                });

                fileItem.appendChild(fileName);
                fileItem.appendChild(closeButton);
                fileListContainer.appendChild(fileItem);
            });
        }
    });

    // 공지글 체크박스 비활성화 방지
    const checkbox = document.getElementById("notice-checkbox");
    if (checkbox) {
        checkbox.addEventListener("change", function () {
            if (!checkbox.checked) {
                alert("⚠️ 공지글은 수정 또는 삭제만 가능합니다.");
                checkbox.checked = true;
            }
        });
    }

    // 수정 버튼 클릭 시 전체 검증
    document.getElementById('updateBtn').addEventListener('click', function (e) {
        const deleteImagesValue = document.getElementById('deleteImages').value;
        const checkedCheckboxes = document.querySelectorAll('.delete-checkbox:checked');
        const currentSubject = document.getElementById('subject').value.trim();
        const currentContent = document.getElementById('content').value.trim();
        const hasNewFiles = fileInput.files.length > 0;
        const hasDeletedImages = deleteImagesValue.length > 0;

        // ✅ 체크박스 체크만 하고 삭제 버튼 안 누른 경우
        if (checkedCheckboxes.length > 0 && !hasDeletedImages) {
            alert("선택한 이미지가 있습니다.\n'선택한 이미지 삭제' 버튼을 눌러주세요.");
            e.preventDefault();
            return;
        }

        // ✅ 아무 것도 변경되지 않은 경우
        if (originalSubject === currentSubject && originalContent === currentContent && !hasNewFiles && !hasDeletedImages) {
            alert("수정한 내용이 없습니다.");
            e.preventDefault();
            return;
        }

        // ✅ 정상 수정 진행
        alert("변경사항을 저장합니다.");
    });
});

// 이미지 삭제 함수
function removeSelectedImages() {
    const checkboxes = document.querySelectorAll('.delete-checkbox:checked');
    const deletedIds = [];

    if (checkboxes.length === 0) {
        alert("삭제할 이미지를 선택해주세요.");
        return;
    }

    checkboxes.forEach(checkbox => {
        deletedIds.push(checkbox.value);
        const polaroidDiv = checkbox.closest('.polaroid');
        if (polaroidDiv) {
            polaroidDiv.style.display = 'none';
        }
    });

    document.getElementById('deleteImages').value = deletedIds.join(',');
    alert("선택한 이미지가 삭제되었습니다.\n변경사항을 저장하려면 '수정' 버튼을 눌러주세요.");
}
