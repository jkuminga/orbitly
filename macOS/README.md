# Routine Desk for macOS

Xcode에서 `RoutineDeskApp.swift`를 포함하는 **macOS App (SwiftUI)** 프로젝트를 만든 뒤 이 폴더의 파일을 추가하세요. Xcode의 **Signing & Capabilities**에서 본인 Apple ID의 Personal Team을 선택하면 유료 개발자 계정 없이 로컬 설치할 수 있습니다.

`TodoStore`는 `tasks` 테이블과 통신하는 상태 객체입니다. 웹에서 로그인해 받은 Supabase access token을 macOS Keychain에 저장하고, 해당 토큰을 `Authorization: Bearer` 헤더로 전송하도록 구현하면 두 앱이 같은 개인 데이터를 공유합니다.

메뉴바의 빠른 추가는 `⌘N`, 오늘 목록 열기는 `⌘O` 단축키를 제공합니다. 전역 단축키(다른 앱 사용 중에도 동작)는 App Sandbox 권한 및 별도 단축키 라이브러리 검토가 필요하므로, 첫 버전에서는 앱이 활성화된 상태의 단축키만 포함했습니다.
