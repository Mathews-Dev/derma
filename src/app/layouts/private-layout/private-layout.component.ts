import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../shared-layout/header/header.component';
import { SidebarComponent } from '../shared-layout/sidebar/sidebar.component';
import { InvitationModalComponent } from '../../shared/components/invitation-modal/invitation-modal.component';

import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-private-layout',
    imports: [CommonModule, RouterModule, HeaderComponent, SidebarComponent, InvitationModalComponent],
    templateUrl: './private-layout.component.html',
    styleUrl: './private-layout.component.css'
})
export class PrivateLayoutComponent {
    showInvitationModal = false;
}
